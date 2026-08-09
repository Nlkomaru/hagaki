export interface WikiThumbnail {
    /** Image uuid — the file lives at `article/<uuid>/assets/<imageId>.avif`. */
    imageId: string;
    /** Base64-encoded blurhash (the stored `blurhash64` form). */
    blurhash64: string;
}

export interface WikiHistoryEntry {
    date: string;
    /** Minecraft player uuid, when recoverable. */
    player: string | null;
    /** `imported` = pre-git history from frontmatter `modified`; `git` = commit. */
    source: "imported" | "git";
    /** Commit sha for `source: "git"` entries. */
    commit?: string;
}

/** Frontmatter `modified` entry — pre-git history imported from a previous system. */
export interface ImportedEdit {
    date: string;
    player: string;
}

export interface WikiPost {
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
}

export interface WikiPostDetail extends WikiPost {
    body: string;
    /**
     * Supplementary pre-git edit history (see the content format's
     * `modified`). Git commits are the primary history; this only carries
     * what happened before the migration. Omitted on new posts.
     */
    modified?: ImportedEdit[];
}

export interface GetAllPostsOptions {
    sortBy?: "created" | "updated" | "title";
    order?: "asc" | "desc";
}

/** Value kinds a {@link CategoryOptionField} can hold. */
export type CategoryOptionFieldType =
    | "string"
    | "integer"
    | "number"
    | "boolean";

/**
 * One extra frontmatter field that posts in a category carry, described well
 * enough for an editor to render an input for it without knowing what the
 * field means. A wiki about places declares coordinates; one about releases
 * declares a version — hagaki stays out of it either way.
 */
export interface CategoryOptionField {
    type: CategoryOptionFieldType;
    /** Input label. Falls back to the field key. */
    label?: string;
    /** Help text shown alongside the input. */
    description?: string;
    /** Placeholder for an empty input. */
    placeholder?: string;
    /** Whether a post in this category must fill it in. */
    required?: boolean;
}

export interface WikiCategory {
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

export interface SaveResult {
    commitSha: string;
    commitUrl: string;
    path: string;
}

export interface CommitWithChecks {
    commit: unknown;
    checks: unknown;
}
