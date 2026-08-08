import matter from "gray-matter";
import type { Committer } from "../auth/index.js";
import { type CommitFile, commitFiles } from "../github/commit-files.js";
import type { GitHubContext } from "../github/octokit.js";
import type { CommitResult, PostDetail } from "../types.js";
import { postFrontmatter } from "./frontmatter.js";
import { articlePaths } from "./paths.js";

export interface SavePostInput {
    post: PostDetail;
    /**
     * Extra files to place in the article's `assets/` directory (images and
     * the like). `name` is a bare file name, e.g. `<id>.avif`.
     */
    assets?: { name: string; content: Uint8Array | ArrayBuffer }[];
    /** File names to remove from `assets/`, e.g. `<id>.avif`. */
    deleteAssets?: string[];
    committer?: Committer;
    /** Defaults to `Update post: <slug>` plus an image add/remove summary. */
    commitMessage?: string;
}

/** The uuid becomes a repo path segment — hold it to the uuid shape. */
const UUID_REGEX = /^[a-f0-9-]{36}$/i;

/**
 * A post only owns its own directory, so an asset name must stay a bare file
 * name. Anything that could climb out of `assets/` is refused before it can
 * reach the tree.
 */
function assertAssetName(name: string, kind: string): void {
    if (
        !name ||
        name.includes("/") ||
        name.includes("\\") ||
        name.includes("..")
    ) {
        throw new Error(
            `savePost: refusing to ${kind} asset "${name}" — expected a bare file name`,
        );
    }
}

function defaultCommitMessage(
    slug: string,
    added: number,
    removed: number,
): string {
    const segments: string[] = [];
    if (added > 0) segments.push(`+${added} image${added === 1 ? "" : "s"}`);
    if (removed > 0)
        segments.push(`-${removed} image${removed === 1 ? "" : "s"}`);
    if (segments.length === 0) return `Update post: ${slug}`;
    return `Update post: ${slug} (${segments.join(", ")})`;
}

/**
 * The one write path for an article: renders `index.md` from the canonical
 * frontmatter and commits it together with the assets being added and removed
 * in a single tree commit. Bundling them keeps `git revert` and the editor's
 * view of the repo in sync.
 */
export async function savePost(
    ctx: GitHubContext,
    input: SavePostInput,
): Promise<CommitResult> {
    const { post } = input;
    if (!post.uuid) {
        throw new Error(
            "savePost: post.uuid is required — mint one before saving",
        );
    }
    if (!UUID_REGEX.test(post.uuid)) {
        throw new Error(`savePost: invalid post uuid "${post.uuid}"`);
    }

    const paths = articlePaths(post.uuid);
    const assets = input.assets ?? [];
    const deleteAssets = input.deleteAssets ?? [];
    for (const asset of assets) assertAssetName(asset.name, "write");
    for (const name of deleteAssets) assertAssetName(name, "delete");

    const files: CommitFile[] = [
        ...assets.map((asset) => ({
            path: paths.assetPath(asset.name),
            content: asset.content,
        })),
        {
            path: paths.indexPath,
            content: matter.stringify(post.body || "", postFrontmatter(post)),
        },
    ];

    return commitFiles(ctx, {
        files,
        deletePaths: deleteAssets.map((name) => paths.assetPath(name)),
        committer: input.committer,
        commitMessage:
            input.commitMessage ??
            defaultCommitMessage(post.slug, assets.length, deleteAssets.length),
    });
}
