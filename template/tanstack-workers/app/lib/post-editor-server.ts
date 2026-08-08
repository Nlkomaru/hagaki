import { createServerFn } from "@tanstack/react-start";
import type { WikiPostDetail } from "hagaki";
import { validateAvifUpload } from "hagaki/image";
import { getHagakiClient } from "./hagaki";
import { stripLegacyPendingImages } from "./post-editor-markdown";
import { emptyPost, postFrontmatter } from "./post-frontmatter";
import { getStringEnv } from "./server-env";

interface CommitPostInput {
    post: WikiPostDetail;
    /**
     * `::img` directive ids referenced by the body that are not committed
     * yet. Their AVIF bytes live in the pending R2 bucket (uploaded while
     * editing) and are moved into the repo by this commit.
     */
    pendingImageIds: string[];
    /** Repo paths of images that should be removed in this commit. */
    deletePaths?: string[];
}

/** Image ids double as R2 key segments and file names — uuids only. */
const UUID_REGEX = /^[a-f0-9-]{36}$/i;

interface GetEditorPostInput {
    slug: string;
    /** Seed values for a brand-new post (from the `/posts/new` form). */
    seed?: { title?: string; category?: string };
    /**
     * uuid carried back in the URL after the first save. Reused for a
     * not-yet-in-manifest post so a reload doesn't mint a fresh uuid and
     * create a duplicate `content/article/<uuid>/` for the same slug.
     */
    knownUuid?: string;
}

export const getEditorPostFn = createServerFn({ method: "GET" })
    .inputValidator((input: GetEditorPostInput) => input)
    .handler(async ({ data }) => {
        const { env } = await import("cloudflare:workers");
        const client = await getHagakiClient();
        const existing = await client.posts.getBySlug(data.slug);
        // A non-uuid `?uuid=` search param must not leak into repo paths —
        // drop it and let emptyPost mint a fresh one instead.
        const knownUuid =
            data.knownUuid && UUID_REGEX.test(data.knownUuid)
                ? data.knownUuid
                : undefined;
        const post = existing
            ? { ...existing, body: stripLegacyPendingImages(existing.body) }
            : {
                  ...emptyPost(data.slug, knownUuid),
                  title: data.seed?.title ?? "",
                  category: data.seed?.category ?? "",
              };
        return {
            post,
            categories: await client.categories.list(),
            cdnBaseUrl: getStringEnv(env, "HAGAKI_CDN_BASE_URL"),
        };
    });

/**
 * Atomic save: pulls every pending image out of the temporary R2 bucket,
 * re-validates it, then commits the markdown post, those images, AND any
 * images the editor wants removed in a single GitHub tree commit. Combining
 * add/update/delete in one commit keeps `git revert` and the editor's view
 * of the repo in sync. The pending R2 objects are deleted only after the
 * commit succeeded.
 */
export const commitPostFn = createServerFn({ method: "POST" })
    .inputValidator((input: CommitPostInput) => input)
    .handler(async ({ data }) => {
        if (!data.post.uuid) {
            throw new Error(
                "commitPostFn: post.uuid is required (mint one on first save)",
            );
        }
        // The uuid becomes both a repo path segment and an R2 key segment —
        // the API route validates its own params, so hold the commit path to
        // the same standard instead of trusting the client.
        if (!UUID_REGEX.test(data.post.uuid)) {
            throw new Error(
                `commitPostFn: invalid post uuid "${data.post.uuid}"`,
            );
        }

        // A post only owns its own directory. Every path we add or delete in
        // this commit must live under `content/article/<uuid>/assets/` — never
        // trust the client to stay in its lane.
        const articleDir = `content/article/${data.post.uuid}`;
        const assetsPrefix = `${articleDir}/assets/`;
        const assertOwned = (path: string, kind: string) => {
            if (
                !path.startsWith(assetsPrefix) ||
                path.includes("..") ||
                path.endsWith("/")
            ) {
                throw new Error(
                    `commitPostFn: refusing to ${kind} "${path}" — outside ${assetsPrefix}`,
                );
            }
        };

        const { env } = await import("cloudflare:workers");
        const imageFiles: { path: string; content: Uint8Array }[] = [];
        const pendingKeys: string[] = [];
        for (const id of data.pendingImageIds) {
            if (!UUID_REGEX.test(id)) {
                throw new Error(`commitPostFn: invalid image id "${id}"`);
            }
            const pendingKey = `pending/${data.post.uuid}/${id}.avif`;
            const object = await env.HAGAKI_PENDING_IMAGES.get(pendingKey);
            if (!object) {
                throw new Error(
                    "画像データが見つかりません。画像を再挿入してください",
                );
            }
            const content = new Uint8Array(await object.arrayBuffer());
            validateAvifUpload(content);
            const path = `${assetsPrefix}${id}.avif`;
            assertOwned(path, "write");
            imageFiles.push({ path, content });
            pendingKeys.push(pendingKey);
        }

        const deletePaths = data.deletePaths ?? [];
        for (const path of deletePaths) assertOwned(path, "delete");

        const { default: matter } = await import("gray-matter");
        const client = await getHagakiClient();
        const postPath = `${articleDir}/index.md`;
        const markdown = matter.stringify(
            data.post.body || "",
            postFrontmatter(data.post),
        );

        const result = await client.commits.commitFiles({
            files: [...imageFiles, { path: postPath, content: markdown }],
            deletePaths,
            commitMessage: commitMessage(
                data.post.slug,
                imageFiles.length,
                deletePaths.length,
            ),
        });

        // The bytes now live in the repo — the pending copies are garbage.
        // Deletion failures are non-fatal: the R2 lifecycle rule on the
        // `pending/` prefix cleans up anything we miss here.
        if (pendingKeys.length > 0) {
            try {
                await env.HAGAKI_PENDING_IMAGES.delete(pendingKeys);
            } catch (e) {
                console.warn(
                    "commitPostFn: failed to delete pending images",
                    e,
                );
            }
        }

        return result;
    });

function commitMessage(slug: string, added: number, removed: number): string {
    const segments: string[] = [];
    if (added > 0) segments.push(`+${added} image${added === 1 ? "" : "s"}`);
    if (removed > 0)
        segments.push(`-${removed} image${removed === 1 ? "" : "s"}`);
    if (segments.length === 0) return `Update post: ${slug}`;
    return `Update post: ${slug} (${segments.join(", ")})`;
}
