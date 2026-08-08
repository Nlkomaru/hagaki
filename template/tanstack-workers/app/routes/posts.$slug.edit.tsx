import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { WikiPostDetail } from "hagaki";
import { diffRemovedImagePaths } from "hagaki/markdown";
import {
    hasActive,
    hasErrors,
    removePending,
    subscribe as subscribePending,
} from "hagaki/pending-images";
import { lazy, type ReactNode, Suspense, useEffect, useState } from "react";
import { CategoryInput } from "~/components/CategoryInput";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { imagePathsFor } from "../lib/image-paths";
import {
    buildPostPayload,
    handleImagePreview,
    handleInsertImage,
    imageUrl,
    sweepOrphanedImageErrors,
} from "../lib/post-editor-images";
import { commitPostFn, getEditorPostFn } from "../lib/post-editor-server";

// MDXEditor (透過に hagaki が wrap している) は client-only なので、
// `~/components/editor` (composite なツールバー+コンテンツのスタイル定義) を
// lazy import で切り出してから読み込む。
const Editor = lazy(() =>
    import("~/components/editor").then((m) => ({ default: m.Editor })),
);

interface EditSearch {
    /** Seed values carried from `/posts/new` for a brand-new post. */
    title?: string;
    category?: string;
    /** uuid pinned in the URL after the first save (see #2 mitigation). */
    uuid?: string;
}

const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.length > 0 ? v : undefined;

export const Route = createFileRoute("/posts/$slug/edit")({
    validateSearch: (search: Record<string, unknown>): EditSearch => ({
        title: str(search.title),
        category: str(search.category),
        uuid: str(search.uuid),
    }),
    loaderDeps: ({ search }) => search,
    loader: ({ params, deps }) =>
        getEditorPostFn({
            data: {
                slug: params.slug,
                seed: { title: deps.title, category: deps.category },
                knownUuid: deps.uuid,
            },
        }),
    component: EditPostPage,
});

function EditPostPage() {
    const { post: initial, categories, cdnBaseUrl } = Route.useLoaderData();
    const router = useRouter();
    const [post, setPost] = useState<WikiPostDetail>(initial);
    // Snapshot of the markdown body as it currently lives on GitHub. We diff
    // this against the unsaved body at commit time so any image references the
    // user removed from the post can be deleted in the same commit.
    const [committedBody, setCommittedBody] = useState(initial.body);
    const [statusMsg, setStatusMsg] = useState<StatusMessage | null>(null);
    const [saving, setSaving] = useState(false);
    const [imagesUploading, setImagesUploading] = useState(false);
    const [imagesFailed, setImagesFailed] = useState(false);
    const updatePost = (patch: Partial<WikiPostDetail>) =>
        setPost((current) => ({ ...current, ...patch }));

    useEffect(() => {
        const update = () => {
            setImagesUploading(hasActive());
            setImagesFailed(hasErrors());
        };
        update();
        return subscribePending(update);
    }, []);

    async function onSave() {
        setSaving(true);
        setStatusMsg(null);
        try {
            // uuid is minted in the loader (emptyPost) so it stays stable for
            // the whole session — a retried save hits the same article dir.
            const { uuid } = post;
            const { body, pendingImageIds } = await buildPostPayload(
                post.body,
                uuid,
                committedBody,
            );
            const deletePaths = diffRemovedImagePaths(
                committedBody,
                body,
                imagePathsFor(uuid),
            );
            const finalPost = { ...post, body };
            const result = await commitPostFn({
                data: { post: finalPost, pendingImageIds, deletePaths },
            });
            setPost(finalPost);
            setCommittedBody(body);
            // コミットに載った分だけ破棄する。clearAll だと、この保存が
            // 走っている間に挿入された（= 今回のコミットに入っていない）
            // 画像のエントリまで消え、次の保存で復元不能になる。
            for (const id of pendingImageIds) removePending(id);
            setStatusMsg({
                kind: "success",
                message: saveMessage(result.commitSha, deletePaths.length),
            });
            // Pin the uuid in the URL so a reload before the CDN manifest
            // catches up reuses it instead of minting a duplicate article.
            await router.navigate({
                to: "/posts/$slug/edit",
                params: { slug: post.slug },
                search: { uuid },
                replace: true,
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
        <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="mb-0">記事を編集</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">slug: {post.slug}</Badge>
                    <Badge variant="outline">
                        uuid: {post.uuid.slice(0, 8)}…
                    </Badge>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">メタ情報</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <PostField id="title" label="Title">
                        <Input
                            id="title"
                            value={post.title}
                            onChange={(e) =>
                                updatePost({ title: e.target.value })
                            }
                        />
                    </PostField>
                    <PostField id="description" label="Description">
                        <Textarea
                            id="description"
                            value={post.description}
                            onChange={(e) =>
                                updatePost({ description: e.target.value })
                            }
                        />
                    </PostField>
                    <CategoryInput
                        value={post.category}
                        categories={categories}
                        onChange={(category) => updatePost({ category })}
                    />
                </CardContent>
            </Card>

            <div className="flex flex-col gap-1.5">
                <Label>Body</Label>
                <div className="rounded-lg border bg-card overflow-hidden">
                    <Suspense
                        fallback={
                            <div className="p-4 text-sm text-muted-foreground">
                                エディタを読み込み中…
                            </div>
                        }
                    >
                        <Editor
                            markdown={post.body}
                            onChange={(body) => {
                                // 本文から消えた失敗画像のエントリを回収し、
                                // 保存ボタンが永久に無効化されるのを防ぐ。
                                sweepOrphanedImageErrors(body);
                                updatePost({ body });
                            }}
                            onInsertImage={(file) =>
                                handleInsertImage(file, post.uuid)
                            }
                            imagePreviewUrlFor={(id) =>
                                // CDN(コミット済み) / R2(pending) の出し分け
                                // はサーバールートが行うので URL は常に一つ。
                                imageUrl(post.uuid, id)
                            }
                            onImagePreview={(src) =>
                                handleImagePreview(src, cdnBaseUrl)
                            }
                        />
                    </Suspense>
                </div>
            </div>

            {statusMsg && (
                <div
                    className={cn(
                        "rounded-md border px-3 py-2 text-sm",
                        statusMsg.kind === "success" &&
                            "border-foreground/20 bg-accent text-foreground",
                        statusMsg.kind === "error" &&
                            "border-destructive/30 bg-destructive/10 text-destructive",
                    )}
                >
                    {statusMsg.message}
                </div>
            )}

            <div className="sticky bottom-0 -mx-4 md:-mx-6 border-t bg-background/80 px-4 md:px-6 py-3 backdrop-blur flex items-center justify-end gap-3">
                {imagesUploading && (
                    <span className="text-sm text-muted-foreground">
                        画像のアップロード待ち…
                    </span>
                )}
                {imagesFailed && (
                    <span className="text-sm text-destructive">
                        画像のアップロードに失敗しています
                    </span>
                )}
                <Button
                    type="button"
                    disabled={saving || imagesUploading || imagesFailed}
                    onClick={onSave}
                >
                    {saving
                        ? "保存中…"
                        : imagesUploading
                          ? "画像処理中…"
                          : "保存"}
                </Button>
            </div>
        </section>
    );
}

interface StatusMessage {
    kind: "error" | "success";
    message: string;
}

function saveMessage(commitSha: string, removedCount: number): string {
    const short = commitSha.slice(0, 7);
    if (removedCount === 0) return `Saved: ${short}`;
    return `Saved: ${short} (removed ${removedCount} image${removedCount === 1 ? "" : "s"})`;
}

function PostField({
    id,
    label,
    children,
}: {
    id: string;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
        </div>
    );
}
