import { n as makeCommitter, t as Committer } from "./index-DeV4k-48.js";
import { Octokit } from "octokit";
//#region src/api/types.d.ts
interface WikiThumbnail {
  /** Image uuid — the file lives at `article/<uuid>/assets/<imageId>.avif`. */
  imageId: string;
  /** Base64-encoded blurhash (the stored `blurhash64` form). */
  blurhash64: string;
}
interface WikiHistoryEntry {
  date: string;
  /** Minecraft player uuid, when recoverable. */
  player: string | null;
  /** `imported` = pre-git history from frontmatter `modified`; `git` = commit. */
  source: "imported" | "git";
  /** Commit sha for `source: "git"` entries. */
  commit?: string;
}
/** Frontmatter `modified` entry — pre-git history imported from a previous system. */
interface ImportedEdit {
  date: string;
  player: string;
}
/**
 * What a post filled in for the option fields its category declares, keyed by
 * the same keys as {@link WikiCategory.option}. Stored under `option:` in the
 * frontmatter, so a category can declare new fields without colliding with the
 * post's own keys. An `"enum"` field holds the chosen
 * {@link CategoryOptionEnumValue.id}.
 */
type PostOptionValues = Record<string, string | number | boolean>;
interface WikiPost {
  title: string;
  slug: string;
  /**
   * Stable directory identifier. A post lives at
   * `content/article/<uuid>/index.mdx` and its images at
   * `content/article/<uuid>/assets/`. `slug` may change over the post's
   * lifetime; `uuid` never does.
   */
  uuid: string;
  description: string;
  category: string;
  thumbnail: WikiThumbnail | null;
  /**
   * Derived by the content pipeline (`info.json` / manifest) from the
   * imported history + git commits; `null` when not generated yet.
   */
  created: string | null;
  updated: string | null;
  /**
   * Values for the option fields the post's category declares. Omitted when
   * the post has none — hagaki neither requires nor interprets them.
   */
  option?: PostOptionValues;
}
interface WikiPostDetail extends WikiPost {
  body: string;
  /**
   * Supplementary pre-git edit history (see the content format's
   * `modified`). Git commits are the primary history; this only carries
   * what happened before the migration. Omitted on new posts.
   */
  modified?: ImportedEdit[];
  /**
   * Draft posts stay out of the generated manifests (`article.json`,
   * `slug-index.json`) and the content worker refuses to serve their
   * `article/<uuid>/` files, so they are only reachable through the
   * repository. Omitted (not `false`) on published posts.
   */
  draft?: boolean;
}
/**
 * Per-article edit summary for one player, folded out of the merged history
 * by the generate step.
 */
interface EditorSummary {
  /** Minecraft player uuid. */
  player: string;
  /** Number of edits this player made to the article. */
  edits: number;
  /** When this player last edited the article. */
  lastEditedAt: string;
}
/**
 * One `article.json` manifest entry. Carries `editors` instead of the full
 * `history` so "articles edited by player X" doesn't require fetching every
 * article's `info.json`.
 */
interface ArticleSummary extends WikiPost {
  editors: EditorSummary[];
}
/** Shape of a generated `article/<uuid>/info.json`. */
interface ArticleInfo extends WikiPost {
  history: WikiHistoryEntry[];
}
interface GetAllPostsOptions {
  sortBy?: "created" | "updated" | "title";
  order?: "asc" | "desc";
}
/** Value kinds a {@link CategoryOptionField} can hold. */
type CategoryOptionFieldType = "string" | "integer" | "number" | "boolean" | "enum";
/**
 * One choice of an `"enum"` field. `id` is what the article frontmatter
 * stores; `display` is what an editor shows in the picker, so renaming a
 * choice never rewrites the articles that picked it.
 */
interface CategoryOptionEnumValue {
  id: string;
  display: string;
}
/**
 * One extra frontmatter field that posts in a category carry, described well
 * enough for an editor to render an input for it without knowing what the
 * field means. A wiki about places declares coordinates; one about releases
 * declares a version — hagaki stays out of it either way.
 */
interface CategoryOptionField {
  type: CategoryOptionFieldType;
  /** Input label. Falls back to the field key. */
  label?: string;
  /** Help text shown alongside the input. */
  description?: string;
  /** Placeholder for an empty input. */
  placeholder?: string;
  /** Whether a post in this category must fill it in. */
  required?: boolean;
  /**
   * Choices for an `"enum"` field, in the order an editor should show them.
   * Only meaningful when `type` is `"enum"`; the frontmatter holds the
   * selected {@link CategoryOptionEnumValue.id}.
   */
  enum?: CategoryOptionEnumValue[];
  /**
   * Value an editor pre-fills a new post's input with. Matches `type` —
   * an `"enum"` field defaults to one of its
   * {@link CategoryOptionEnumValue.id}s. Existing posts are untouched:
   * this is an editing convenience, not a fallback applied on read.
   */
  default?: string | number | boolean;
}
interface WikiCategory {
  title: string;
  slug: string;
  body: string;
  /**
   * Extra frontmatter fields posts in this category carry, keyed by the
   * frontmatter key they are stored under. Categories whose posts carry
   * nothing extra omit it.
   */
  option?: Record<string, CategoryOptionField>;
}
interface SaveResult {
  commitSha: string;
  commitUrl: string;
  path: string;
}
interface CommitWithChecks {
  commit: unknown;
  checks: unknown;
}
//#endregion
//#region src/api/content.d.ts
interface ContentConfig {
  cdnBaseUrl: string;
  paths?: {
    /** Manifest listing every article (defaults to `/article.json`). */
    posts?: string;
    /** Manifest listing every category (defaults to `/categories.json`). */
    categories?: string;
    /** slug → uuid map (defaults to `/slug-index.json`). */
    slugIndex?: string;
    /**
     * Resolve a post's `index.mdx` URL given its directory uuid. Defaults
     * to `/article/<uuid>/index.mdx`.
     */
    postByUuid?: (uuid: string) => string;
    /**
     * Resolve a post's generated `info.json` URL given its directory
     * uuid. Defaults to `/article/<uuid>/info.json`.
     */
    postInfoByUuid?: (uuid: string) => string;
  };
}
//#endregion
//#region src/api/files.d.ts
interface RepoFile {
  path: string;
  /** UTF-8 decoded contents. */
  text: string;
  /** Blob sha of this version. */
  sha: string;
}
interface RepoEntry {
  path: string;
  name: string;
  type: "file" | "dir";
  sha: string;
  size: number;
}
interface PathCommit {
  sha: string;
  message: string;
  /** Commit author name — `makeCommitter` writes `"<name> (<uuid>)"`. */
  author: string;
  date: string;
}
//#endregion
//#region src/api/tree-commit.d.ts
interface CommitFile {
  /**
   * Repository path, e.g. `content/article/<uuid>/index.mdx` or
   * `content/article/<uuid>/assets/<imageId>.avif`.
   */
  path: string;
  /**
   * File body. Binary content (images) can be passed as bytes or a `Blob` —
   * e.g. a `File` taken straight from a request's `FormData` — or as a
   * base64 string with `encoding: "base64"` when it arrived in a JSON
   * payload.
   */
  content: ArrayBuffer | Uint8Array | Blob | string;
  /**
   * How a string `content` is interpreted: `"utf-8"` text (default) or
   * already-encoded `"base64"` bytes. Ignored for non-string content.
   */
  encoding?: "utf-8" | "base64";
}
interface CommitFilesInput {
  files?: CommitFile[];
  /**
   * Repository paths to remove in the same commit. Each path is recorded as
   * a null-sha entry in the new tree, which tells GitHub to drop it.
   */
  deletePaths?: string[];
  committer?: Committer;
  commitMessage: string;
}
interface CommitFilesResult {
  commitSha: string;
  commitUrl: string;
  /** Added or updated paths. */
  paths: string[];
  /** Paths removed in this commit, if any. */
  deletedPaths: string[];
}
//#endregion
//#region src/api/posts.d.ts
interface SavePostOptions {
  committer?: Committer;
  commitMessage?: string;
  /**
   * Extra files to write in the same commit — typically the images inserted
   * while the post was being written (`collectPendingImages` from
   * `hagaki/pending-images`, sent by the browser as `Blob`s or base64).
   * Supplying these (or {@link deletePaths}) switches the save to a tree
   * commit so the post and its assets land together.
   */
  files?: CommitFile[];
  /** Repository paths to remove in the same commit. */
  deletePaths?: string[];
}
//#endregion
//#region src/api/client.d.ts
type AuthToken = string | (() => string | Promise<string>);
interface HagakiConfig {
  github: {
    owner: string;
    repo: string;
    branch?: string;
    contentPath?: string;
    auth: AuthToken;
  };
  content?: ContentConfig;
  fetch?: typeof fetch;
}
interface HagakiClient {
  posts: {
    list(options?: GetAllPostsOptions): Promise<WikiPost[]>;
    getBySlug(slug: string): Promise<WikiPostDetail | null>;
    getByUuid(uuid: string): Promise<WikiPostDetail | null>;
    /**
     * Read a post from the repository instead of the CDN, so an editor
     * sees commits that have not been deployed yet. Pass `ref` to read an
     * older revision. `created` / `updated` are `null` here — they come
     * from the generated `info.json`, which only the CDN has.
     */
    getFromRepo(uuid: string, options?: {
      ref?: string;
    }): Promise<WikiPostDetail | null>;
    /** Whether the post's `index.mdx` exists in the repository. */
    existsInRepo(uuid: string): Promise<boolean>;
    /**
     * Uuid of every post in the repository, drafts included, from a
     * single git-tree listing. Diff against the CDN manifest to find
     * posts the CDN doesn't serve (drafts, not-yet-deployed).
     */
    listUuidsInRepo(): Promise<string[]>;
    /** Every repository path belonging to a post (body + assets). */
    repoPaths(uuid: string): Promise<string[]>;
    /** Commits that touched the post's `index.mdx`, newest first. */
    history(uuid: string, options?: {
      perPage?: number;
    }): Promise<PathCommit[]>;
    /** Unified diff of the post body between two commits. */
    diff(uuid: string, base: string, head: string): Promise<string | null>;
    save(post: WikiPostDetail, options?: SavePostOptions): Promise<SaveResult>;
  };
  categories: {
    list(): Promise<WikiCategory[]>;
  };
  /** Raw repository reads, for anything the CDN doesn't serve. */
  files: {
    get(path: string, ref?: string): Promise<RepoFile | null>;
    /** Raw bytes — for binary files (images) UTF-8 decoding would corrupt. */
    getBinary(path: string, ref?: string): Promise<Uint8Array | null>;
    exists(path: string, ref?: string): Promise<boolean>;
    list(path: string, ref?: string): Promise<RepoEntry[]>;
    listRecursive(path: string, ref?: string): Promise<string[]>;
  };
  commits: {
    getWithChecks(sha: string): Promise<CommitWithChecks>;
    commitFiles(input: CommitFilesInput): Promise<CommitFilesResult>;
  };
}
export declare function createHagakiClient(config: HagakiConfig): HagakiClient;
//#endregion
//#region src/api/slug.d.ts
export declare function toUrlSlug(str: string): string;
//#endregion
//#region src/api/url.d.ts
/**
 * Resolve a markdown image / content URL against the configured CDN base.
 * Already-absolute URLs (`http://`, `https://`, `data:`, etc.) are returned
 * unchanged. An empty `cdnBaseUrl` is treated as a no-op so this helper can
 * be called unconditionally.
 */
export declare function resolveCdnUrl(src: string, cdnBaseUrl: string): string;
//#endregion
export { type ArticleInfo, type ArticleSummary, type AuthToken, type CategoryOptionEnumValue, type CategoryOptionField, type CategoryOptionFieldType, type CommitFile, type CommitFilesInput, type CommitFilesResult, type CommitWithChecks, type Committer, type ContentConfig, type EditorSummary, type GetAllPostsOptions, type HagakiClient, type HagakiConfig, type ImportedEdit, type PathCommit, type PostOptionValues, type RepoEntry, type RepoFile, type SavePostOptions, type SaveResult, type WikiCategory, type WikiHistoryEntry, type WikiPost, type WikiPostDetail, type WikiThumbnail, makeCommitter };
//# sourceMappingURL=index.d.ts.map