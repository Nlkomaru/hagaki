import { createFileRoute } from "@tanstack/react-router";
import {
    ImageValidationError,
    MAX_AVIF_BYTES,
    validateAvifUpload,
} from "hagaki/image";

/**
 * Temporary storage for images inserted while editing. The editor PUTs each
 * encoded AVIF here as soon as it is ready, then GETs it back as the in-editor
 * preview until the post is saved (at which point `commitPostFn` moves the
 * bytes into the GitHub repo and deletes the pending object).
 *
 * Objects live in the `HAGAKI_PENDING_IMAGES` R2 bucket under
 * `pending/<postUuid>/<imageId>.avif`; an R2 lifecycle rule on the `pending/`
 * prefix cleans up uploads that were never saved (see wrangler.jsonc).
 */

// Both path segments are uuids that end up in an R2 object key — reject
// anything else before building the key.
const UUID_REGEX = /^[a-f0-9-]{36}$/i;

function pendingKey(uuid: string, imageId: string): string | null {
    if (!UUID_REGEX.test(uuid) || !UUID_REGEX.test(imageId)) return null;
    return `pending/${uuid}/${imageId}.avif`;
}

export const Route = createFileRoute("/api/pending-images/$uuid/$imageId")({
    server: {
        handlers: {
            PUT: async ({ request, params }) => {
                const key = pendingKey(params.uuid, params.imageId);
                if (!key) {
                    return new Response("Invalid uuid or imageId", {
                        status: 400,
                    });
                }
                // Reject oversized bodies BEFORE buffering them — without
                // this an unauthenticated client could PUT a 100MB body and
                // have the isolate buffer the whole thing prior to the
                // validateAvifUpload size check. The editor always sends a
                // fixed-length Uint8Array, so a missing Content-Length only
                // ever comes from other clients — refuse those outright.
                const contentLength = Number(
                    request.headers.get("content-length"),
                );
                if (!Number.isFinite(contentLength) || contentLength <= 0) {
                    return new Response("Content-Length required", {
                        status: 411,
                    });
                }
                if (contentLength > MAX_AVIF_BYTES) {
                    return new Response("Payload too large", { status: 413 });
                }
                const bytes = new Uint8Array(await request.arrayBuffer());
                try {
                    // Same 500KB + `ftyp` AVIF check the commit path runs —
                    // never store bytes we would refuse to commit later.
                    validateAvifUpload(bytes);
                } catch (e) {
                    if (e instanceof ImageValidationError) {
                        return new Response(e.message, { status: 400 });
                    }
                    throw e;
                }
                const { env } = await import("cloudflare:workers");
                await env.HAGAKI_PENDING_IMAGES.put(key, bytes, {
                    httpMetadata: { contentType: "image/avif" },
                });
                return Response.json({ ok: true });
            },
            GET: async ({ params }) => {
                const key = pendingKey(params.uuid, params.imageId);
                if (!key) {
                    return new Response("Invalid uuid or imageId", {
                        status: 400,
                    });
                }
                const { env } = await import("cloudflare:workers");
                const object = await env.HAGAKI_PENDING_IMAGES.get(key);
                if (!object) {
                    return new Response("Not found", { status: 404 });
                }
                return new Response(object.body, {
                    headers: {
                        "Content-Type": "image/avif",
                        // Preview only — the canonical URL after saving is the
                        // CDN one, so never let this response stick in caches.
                        "Cache-Control": "private, no-store",
                    },
                });
            },
        },
    },
});
