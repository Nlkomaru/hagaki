import { createServerFn } from "@tanstack/react-start";
import type { PostDetail } from "hagaki";
import { validateAvifUpload } from "hagaki/image";
import { getHagakiClient } from "./hagaki";
import { emptyPost } from "./post-frontmatter";

interface CommitPostInput {
    post: PostDetail;
    /**
     * `::img` directive ids referenced by the body that are not committed
     * yet. Their AVIF bytes live in the pending R2 bucket (uploaded while
     * editing) and are moved into the repo by this commit.
     */
    pendingImageIds: string[];
    /** File names to remove from the article's `assets/` (e.g. `<id>.avif`). */
    deleteAssets?: string[];
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
        const client = await getHagakiClient();
        const existing = await client.posts.getBySlug(data.slug);
        // A non-uuid `?uuid=` search param must not leak into repo paths —
        // drop it and let emptyPost mint a fresh one instead.
        const knownUuid =
            data.knownUuid && UUID_REGEX.test(data.knownUuid)
                ? data.knownUuid
                : undefined;
        const post = existing ?? {
            ...emptyPost(data.slug, knownUuid),
            title: data.seed?.title ?? "",
            category: data.seed?.category ?? "",
        };
        return { post, categories: await client.categories.list() };
    });

/**
 * Atomic save: pulls every pending image out of the temporary R2 bucket,
 * re-validates it, then hands the post, those images, AND any images the
 * editor wants removed to `posts.save()`, which writes them in a single
 * GitHub tree commit. Combining add/update/delete in one commit keeps
 * `git revert` and the editor's view of the repo in sync.
 *
 * The pending R2 objects are deliberately NOT deleted here: `/api/images`
 * keeps serving them until the content-worker redeploy makes the CDN copy
 * available, and the R2 lifecycle rule on the `pending/` prefix expires
 * them automatically afterwards.
 */
export const commitPostFn = createServerFn({ method: "POST" })
    .inputValidator((input: CommitPostInput) => input)
    .handler(async ({ data }) => {
        // The uuid becomes an R2 key segment here and a repo path segment
        // inside `posts.save()` — the API route validates its own params, so
        // hold this path to the same standard instead of trusting the client.
        if (!UUID_REGEX.test(data.post.uuid)) {
            throw new Error(
                `commitPostFn: invalid post uuid "${data.post.uuid}"`,
            );
        }

        const { env } = await import("cloudflare:workers");
        const assets: { name: string; content: Uint8Array }[] = [];
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
            assets.push({ name: `${id}.avif`, content });
        }

        const client = await getHagakiClient();
        return client.posts.save({
            post: data.post,
            assets,
            deleteAssets: data.deleteAssets,
        });
    });
