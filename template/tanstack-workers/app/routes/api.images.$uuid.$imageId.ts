import { createFileRoute } from "@tanstack/react-router";
import { articlePaths } from "hagaki";
import {
    ImageValidationError,
    MAX_AVIF_BYTES,
    validateAvifUpload,
} from "hagaki/image";
import { getStringEnv } from "~/lib/server-env";

/**
 * Single URL for every `::img` directive image, backed by two stores:
 *
 *   GET  — serves the committed copy from the CDN (GitHub-backed
 *          content-worker) when it exists, and falls back to the pending R2
 *          object otherwise. Callers never need to know whether an image has
 *          been committed yet or whether the CDN deploy has caught up — the
 *          route picks the source automatically.
 *   PUT  — uploads an encoded AVIF into the pending R2 bucket while editing.
 *
 * Pending objects live in `HAGAKI_PENDING_IMAGES` under
 * `pending/<postUuid>/<imageId>.avif`. They are intentionally NOT deleted on
 * commit: they bridge the window until the content-worker redeploy makes the
 * CDN copy available, and the R2 lifecycle rule on the `pending/` prefix
 * expires them afterwards (see wrangler.jsonc).
 */

// Both path segments are uuids that end up in an R2 object key — reject
// anything else before building the key.
const UUID_REGEX = /^[a-f0-9-]{36}$/i;

function pendingKey(uuid: string, imageId: string): string | null {
    if (!UUID_REGEX.test(uuid) || !UUID_REGEX.test(imageId)) return null;
    return `pending/${uuid}/${imageId}.avif`;
}

export const Route = createFileRoute("/api/images/$uuid/$imageId")({
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

                // Committed copy first. Image ids are minted per upload and
                // the bytes at a given path never change, so a CDN hit can be
                // cached forever.
                const cdnBaseUrl = getStringEnv(env, "HAGAKI_CDN_BASE_URL");
                if (cdnBaseUrl) {
                    // hagaki owns the article layout — build the CDN path from
                    // `articlePaths` instead of restating it here.
                    const assetUrl = `${articlePaths(params.uuid).assetUrlPrefix}${params.imageId}.avif`;
                    const cdnRes = await fetch(`${cdnBaseUrl}${assetUrl}`);
                    if (cdnRes.ok) {
                        return new Response(cdnRes.body, {
                            headers: {
                                "Content-Type": "image/avif",
                                "Cache-Control":
                                    "public, max-age=31536000, immutable",
                            },
                        });
                    }
                }

                // Not on the CDN (yet) — fall back to the pending R2 copy.
                // Never cacheable: the next request should retry the CDN.
                const object = await env.HAGAKI_PENDING_IMAGES.get(key);
                if (!object) {
                    return new Response("Not found", { status: 404 });
                }
                return new Response(object.body, {
                    headers: {
                        "Content-Type": "image/avif",
                        "Cache-Control": "private, no-store",
                    },
                });
            },
        },
    },
});
