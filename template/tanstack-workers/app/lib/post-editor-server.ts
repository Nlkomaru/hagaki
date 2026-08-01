import { createServerFn } from "@tanstack/react-start";
import type { WikiPostDetail } from "hagaki";
import { validateAvifUpload } from "hagaki/image";
import { base64ToBytes } from "./base64";
import { getHagakiClient } from "./hagaki";
import {
    stripLegacyPendingImages,
    type UploadedImage,
} from "./post-editor-markdown";
import { emptyPost, postFrontmatter } from "./post-frontmatter";
import { getStringEnv } from "./server-env";

interface CommitPostInput {
    post: WikiPostDetail;
    /** Already-validated, client-encoded AVIF images keyed by repo path. */
    images: UploadedImage[];
    /** Repo paths of images that should be removed in this commit. */
    deletePaths?: string[];
}

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
        const client = getHagakiClient();
        const existing = await client.posts.getBySlug(data.slug);
        const post = existing
            ? { ...existing, body: stripLegacyPendingImages(existing.body) }
            : {
                  ...emptyPost(data.slug, data.knownUuid),
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
 * Atomic save: validates every uploaded image, then commits the markdown
 * post, any new images, AND any images the editor wants removed in a single
 * GitHub tree commit. Combining add/update/delete in one commit keeps
 * `git revert` and the editor's view of the repo in sync.
 */
export const commitPostFn = createServerFn({ method: "POST" })
    .inputValidator((input: CommitPostInput) => input)
    .handler(async ({ data }) => {
        if (!data.post.uuid) {
            throw new Error(
                "commitPostFn: post.uuid is required (mint one on first save)",
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

        const imageFiles = data.images.map((image) => {
            assertOwned(image.path, "write");
            const content = base64ToBytes(image.avifBase64);
            validateAvifUpload(content);
            return { path: image.path, content };
        });

        const deletePaths = data.deletePaths ?? [];
        for (const path of deletePaths) assertOwned(path, "delete");

        const { default: matter } = await import("gray-matter");
        const client = getHagakiClient();
        const postPath = `${articleDir}/index.md`;
        const markdown = matter.stringify(
            data.post.body || "",
            postFrontmatter(data.post),
        );

        return client.commits.commitFiles({
            files: [...imageFiles, { path: postPath, content: markdown }],
            deletePaths,
            commitMessage: commitMessage(
                data.post.slug,
                data.images.length,
                deletePaths.length,
            ),
        });
    });

function commitMessage(slug: string, added: number, removed: number): string {
    const segments: string[] = [];
    if (added > 0) segments.push(`+${added} image${added === 1 ? "" : "s"}`);
    if (removed > 0)
        segments.push(`-${removed} image${removed === 1 ? "" : "s"}`);
    if (segments.length === 0) return `Update post: ${slug}`;
    return `Update post: ${slug} (${segments.join(", ")})`;
}
