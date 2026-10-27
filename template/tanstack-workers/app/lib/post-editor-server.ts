import type { WikiPostDetail } from "@morinoparty/hagaki";
import { validateAvifUpload } from "@morinoparty/hagaki/image";
import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "./auth-server";
import { base64ToBytes } from "./base64";
import { resolveCommitter } from "./committer";
import { getHagakiClient } from "./hagaki";
import type { EncodedImage } from "./post-editor-images";
import { emptyPost, postFrontmatter } from "./post-frontmatter";
import { getStringEnv } from "./server-env";

interface CommitPostInput {
    post: WikiPostDetail;
    /**
     * Images referenced by the body that are not committed yet — the AVIF
     * bytes the editor kept in memory, base64-encoded for the JSON payload.
     */
    images: EncodedImage[];
    /** Repo paths of images that should be removed in this commit. */
    deletePaths?: string[];
}

/** Post and image ids become repo path segments — uuids only. */
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
    .validator((input: GetEditorPostInput) => input)
    .handler(async ({ data }) => {
        // エンドポイント単位の保護: server fn は直接叩ける RPC なので、
        // レイアウト側の beforeLoad ではなくここで検証する(未認証 401)。
        await requireSession();
        const { env } = await import("cloudflare:workers");
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
        return {
            post,
            categories: await client.categories.list(),
            cdnBaseUrl: getStringEnv(env, "HAGAKI_CDN_BASE_URL"),
        };
    });

/**
 * Atomic save: validates every new image the editor sent, then commits the
 * markdown post, those images, AND any images the editor wants removed in a
 * single GitHub tree commit. Combining add/update/delete in one commit keeps
 * `git revert` and the editor's view of the repo in sync.
 */
export const commitPostFn = createServerFn({ method: "POST" })
    .validator((input: CommitPostInput) => input)
    .handler(async ({ data }) => {
        await requireSession();
        // Committer は userinfo 由来の OIDC sub + preferred_username
        // (session.user.id は DB-less では不安定なため使わない —
        // lib/committer.ts)。sub が hagaki の userId になる。
        const committer = await resolveCommitter();
        if (!data.post.uuid) {
            throw new Error(
                "commitPostFn: post.uuid is required (mint one on first save)",
            );
        }
        // The uuid becomes a repo path segment — never trust the client.
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

        const imageFiles: { path: string; content: Uint8Array }[] = [];
        for (const { imageId, base64 } of data.images) {
            if (!UUID_REGEX.test(imageId)) {
                throw new Error(`commitPostFn: invalid image id "${imageId}"`);
            }
            const content = base64ToBytes(base64);
            // 500KB + `ftyp` AVIF check — never commit arbitrary bytes.
            validateAvifUpload(content);
            const path = `${assetsPrefix}${imageId}.avif`;
            assertOwned(path, "write");
            imageFiles.push({ path, content });
        }

        const deletePaths = data.deletePaths ?? [];
        for (const path of deletePaths) assertOwned(path, "delete");

        const { default: matter } = await import("gray-matter");
        const client = await getHagakiClient();
        const postPath = `${articleDir}/index.mdx`;
        const markdown = matter.stringify(
            data.post.body || "",
            postFrontmatter(data.post),
        );

        const result = await client.commits.commitFiles({
            files: [...imageFiles, { path: postPath, content: markdown }],
            deletePaths,
            committer,
            commitMessage: commitMessage(
                data.post.slug,
                imageFiles.length,
                deletePaths.length,
            ),
        });

        return result;
    });

// gitmoji: 📝 = add/update content.
function commitMessage(slug: string, added: number, removed: number): string {
    const segments: string[] = [];
    if (added > 0) segments.push(`+${added} image${added === 1 ? "" : "s"}`);
    if (removed > 0)
        segments.push(`-${removed} image${removed === 1 ? "" : "s"}`);
    if (segments.length === 0) return `📝 Update post: ${slug}`;
    return `📝 Update post: ${slug} (${segments.join(", ")})`;
}
