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

/**
 * An external page a category wants to show alongside its posts — a map, a
 * dashboard, a live view. Deliberately just a URL: hagaki does not know what
 * the page is, and the consuming site decides how (and whether) to render it.
 * Layout is the site's concern, so no sizing lives here.
 */
export interface CategoryEmbed {
    /** Full URL to load in the frame, query string included. */
    url: string;
    /** Accessible name for the frame. */
    title?: string;
}

export interface WikiCategory {
    title: string;
    slug: string;
    body: string;
    /**
     * Whether posts in this category carry coordinates (`x` / `y`). Used to
     * decide if the editor must ask for them. Independent of {@link embed} —
     * a category can have coordinates without an embed, and vice versa.
     */
    hasPosition: boolean;
    /** Optional page to embed on the category view. */
    embed?: CategoryEmbed;
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
