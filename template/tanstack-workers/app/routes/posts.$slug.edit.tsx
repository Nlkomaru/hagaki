import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { WikiPostDetail } from "hagaki";
import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import { getHagakiClient } from "../lib/hagaki";
import { encodeImageTitle } from "../lib/image-title";
import { validateAvifUpload } from "../lib/image-validation";
import {
    addPending,
    clearAll as clearPending,
    getPending,
    hasUnprocessed,
    idFromPendingUrl,
    pendingUrlFor,
    subscribe as subscribePending,
} from "../lib/pending-image-store";

// MDXEditor (透過に hagaki が wrap している) は client-only なので、
// `~/components/editor` (composite なツールバー+コンテンツのスタイル定義) を
// lazy import で切り出してから読み込む。
const Editor = lazy(() =>
    import("~/components/editor").then((m) => ({ default: m.Editor })),
);

interface UploadedImage {
    /** Repository path, e.g. `content/img/abc.avif`. */
    path: string;
    /** Base64-encoded AVIF bytes. */
    avifBase64: string;
}

interface CommitPostInput {
    post: WikiPostDetail;
    /** Already-validated, client-encoded AVIF images keyed by repo path. */
    images: UploadedImage[];
}

/**
 * Strip any `pending:<id>` image references from a loaded markdown body.
 * These are session-local placeholders; if one made it into GitHub (legacy
 * bug, manual edit, etc.) it would never resolve, so we drop the whole image
 * node on load rather than leave a broken `<img>` in the editor.
 */
const LEGACY_PENDING_IMG_REGEX =
    /!\[[^\]]*\]\(pending\\?:[a-f0-9-]+(?:\s+"[^"]*")?\)/g;

function stripLegacyPendingImages(body: string): string {
    return body.replace(LEGACY_PENDING_IMG_REGEX, "");
}

const getPostFn = createServerFn({ method: "GET" })
    .inputValidator((slug: string) => slug)
    .handler(async ({ data: slug }) => {
        const { env } = await import("cloudflare:workers");
        const client = getHagakiClient();
        const post = await client.posts.getBySlug(slug);
        const cdnBaseUrl =
            (env as unknown as Record<string, string | undefined>)
                .HAGAKI_CDN_BASE_URL ?? "";
        const cleaned = post
            ? { ...post, body: stripLegacyPendingImages(post.body) }
            : {
                  title: "",
                  slug,
                  description: "",
                  date: new Date().toISOString().slice(0, 10),
                  category: "",
                  image: "",
                  body: "",
              };
        return { post: cleaned, cdnBaseUrl };
    });

/**
 * Atomic save: validates every image, then commits the markdown post AND all
 * referenced images in a single GitHub tree commit. This way the editor never
 * leaves orphan blobs behind (e.g. when the user inserts the wrong image),
 * and `git revert` rolls back the post and its images together.
 */
const commitPostFn = createServerFn({ method: "POST" })
    .inputValidator((input: CommitPostInput) => input)
    .handler(async ({ data }) => {
        for (const img of data.images) {
            const bytes = decodeBase64(img.avifBase64);
            validateAvifUpload(bytes);
        }
        const { default: matter } = await import("gray-matter");
        const client = getHagakiClient();

        const postPath = `content/wiki/${data.post.slug}.md`;
        const markdown = matter.stringify(data.post.body || "", {
            title: data.post.title,
            slug: data.post.slug,
            category: data.post.category,
            description: data.post.description,
            image: data.post.image || "",
        });

        const files = [
            ...data.images.map((img) => ({
                path: img.path,
                content: decodeBase64(img.avifBase64),
            })),
            { path: postPath, content: markdown },
        ];

        const result = await client.commits.commitFiles({
            files,
            commitMessage:
                data.images.length > 0
                    ? `Update post: ${data.post.slug} (+ ${data.images.length} image${data.images.length === 1 ? "" : "s"})`
                    : `Update post: ${data.post.slug}`,
        });
        return result;
    });

function decodeBase64(b64: string): Uint8Array {
    if (typeof Buffer !== "undefined") {
        return new Uint8Array(Buffer.from(b64, "base64"));
    }
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

export const Route = createFileRoute("/posts/$slug/edit")({
    loader: ({ params }) => getPostFn({ data: params.slug }),
    component: EditPostPage,
});

function EditPostPage() {
    const { post: initial, cdnBaseUrl } = Route.useLoaderData();
    const router = useRouter();
    const [post, setPost] = useState<WikiPostDetail>(initial);
    const [statusMsg, setStatusMsg] = useState<{
        kind: "error" | "success";
        message: string;
    } | null>(null);
    const [saving, setSaving] = useState(false);
    const [imagesProcessing, setImagesProcessing] = useState(false);

    useEffect(() => {
        const update = () => setImagesProcessing(hasUnprocessed());
        update();
        return subscribePending(update);
    }, []);

    async function onSave() {
        setSaving(true);
        setStatusMsg(null);
        try {
            const { body, images } = await buildPostPayload(post.body);
            const finalPost = { ...post, body };
            const result = await commitPostFn({
                data: { post: finalPost, images },
            });
            setPost(finalPost);
            clearPending();
            setStatusMsg({
                kind: "success",
                message: `Saved: ${result.commitSha.slice(0, 7)}`,
            });
            await router.invalidate();
        } catch (e) {
            setStatusMsg({
                kind: "error",
                message: e instanceof Error ? e.message : String(e),
            });
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="flex flex-col gap-4">
            <h1>Edit: {post.slug}</h1>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                    id="title"
                    value={post.title}
                    onChange={(e) =>
                        setPost({ ...post, title: e.target.value })
                    }
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                    id="description"
                    value={post.description}
                    onChange={(e) =>
                        setPost({ ...post, description: e.target.value })
                    }
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Category</Label>
                <Input
                    id="category"
                    value={post.category}
                    onChange={(e) =>
                        setPost({ ...post, category: e.target.value })
                    }
                />
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
                <Suspense
                    fallback={
                        <div className="p-4 text-muted-foreground">
                            Loading…
                        </div>
                    }
                >
                    <Editor
                        markdown={post.body}
                        onChange={(body) => setPost({ ...post, body })}
                        onImageUpload={handleImageUpload}
                        onImagePreview={(src) =>
                            handleImagePreview(src, cdnBaseUrl)
                        }
                    />
                </Suspense>
            </div>

            {statusMsg && (
                <div
                    className={cn(
                        "rounded-md px-3 py-2 text-sm",
                        statusMsg.kind === "success" &&
                            "bg-primary/10 text-primary",
                        statusMsg.kind === "error" &&
                            "bg-destructive/10 text-destructive",
                    )}
                >
                    {statusMsg.message}
                </div>
            )}

            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    disabled={saving || imagesProcessing}
                    onClick={onSave}
                >
                    {saving
                        ? "Saving…"
                        : imagesProcessing
                          ? "Processing image…"
                          : "Save"}
                </Button>
                {imagesProcessing && (
                    <span className="text-sm text-muted-foreground">
                        画像のエンコード待ち
                    </span>
                )}
            </div>
        </section>
    );
}

async function handleImageUpload(file: File): Promise<string> {
    // Kick off AVIF encode in the background; resolve immediately with a
    // placeholder URL so the editor shows the preview blob right away. The
    // actual upload happens on save by awaiting the `processing` promise.
    const processing = import("../lib/image-pipeline").then(
        ({ processImage }) => processImage(file),
    );
    processing.catch(() => {});
    const entry = addPending({ file, processing });
    return pendingUrlFor(entry.id);
}

async function handleImagePreview(
    src: string,
    cdnBaseUrl: string,
): Promise<string> {
    const id = idFromPendingUrl(src);
    if (id) {
        const entry = getPending(id);
        if (entry) return entry.previewBlobUrl;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return src;
    if (!cdnBaseUrl) return src;
    const base = cdnBaseUrl.replace(/\/$/, "");
    const path = src.startsWith("/") ? src : `/${src}`;
    return `${base}${path}`;
}

const PENDING_IMG_REGEX =
    /!\[([^\]]*)\]\((pending:[a-f0-9-]+)(?:\s+"[^"]*")?\)/g;

/**
 * Walk the markdown body, replace each `pending:<id>` URL with the final
 * `/img/<id>.avif "blurhash=..&w=..&h=.."` form, and collect the corresponding
 * AVIF bytes so the server can commit them alongside the post.
 */
async function buildPostPayload(markdown: string): Promise<{
    body: string;
    images: UploadedImage[];
}> {
    const matches = [...markdown.matchAll(PENDING_IMG_REGEX)];
    if (matches.length === 0) {
        return { body: markdown, images: [] };
    }

    type Resolved = { replacement: string; image: UploadedImage };
    const resolved = new Map<string, Resolved>();

    for (const match of matches) {
        const placeholder = match[2];
        if (!placeholder || resolved.has(placeholder)) continue;
        const id = idFromPendingUrl(placeholder);
        if (!id) continue;
        const entry = getPending(id);
        if (!entry) {
            throw new Error(
                `Image upload state lost for ${placeholder}. Please re-insert the image.`,
            );
        }

        const processed = await entry.processing;
        const filename = `${entry.id}.avif`;
        const url = `/img/${filename}`;
        const title = encodeImageTitle({
            blurhash: processed.blurhash,
            width: processed.width,
            height: processed.height,
        });
        resolved.set(placeholder, {
            replacement: `${url} "${title}"`,
            image: {
                path: `content/img/${filename}`,
                avifBase64: bytesToBase64(processed.avif),
            },
        });
    }

    const body = markdown.replace(
        PENDING_IMG_REGEX,
        (full: string, alt: string, placeholder: string) => {
            const r = resolved.get(placeholder);
            return r ? `![${alt}](${r.replacement})` : full;
        },
    );

    return {
        body,
        images: Array.from(resolved.values()).map((r) => r.image),
    };
}
