/**
 * `hagaki` — the GitHub-backed content client.
 *
 *   - `createHagakiClient` wires the GitHub write side (posts, commits) and
 *     the CDN read side (posts, categories) behind one object.
 *   - `articlePaths` is the single source of truth for the on-disk article
 *     layout; `postFrontmatter` is the canonical `index.md` frontmatter.
 *   - `toUrlSlug` / `resolveCdnUrl` are the shared string helpers the editor
 *     and the renderer both need.
 *
 * Committer helpers live in `hagaki/auth`.
 */

export type { Committer } from "./auth/index.js";
export type { AuthToken, HagakiClient, HagakiConfig } from "./client.js";
export { createHagakiClient } from "./client.js";
export type { ContentPaths } from "./content/fetcher.js";
export type {
    CommitFile,
    CommitFilesInput,
} from "./github/commit-files.js";
export type { PostFrontmatterOptions } from "./posts/frontmatter.js";
export { postFrontmatter } from "./posts/frontmatter.js";
export type { ArticlePaths } from "./posts/paths.js";
export { articlePaths } from "./posts/paths.js";
export type { SavePostInput } from "./posts/save.js";
export { toUrlSlug } from "./shared/slug.js";
export { resolveCdnUrl } from "./shared/url.js";
export type {
    Category,
    CheckRun,
    CommitResult,
    CommitStatus,
    ListPostsOptions,
    Post,
    PostDetail,
} from "./types.js";
