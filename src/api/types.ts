export interface WikiPost {
    title: string;
    slug: string;
    /**
     * Stable directory identifier. A post lives at
     * `content/article/<uuid>/index.md` and its images at
     * `content/article/<uuid>/assets/`. `slug` may change over the post's
     * lifetime; `uuid` never does.
     */
    uuid: string;
    description: string;
    date: string;
    category: string;
    image?: string;
}

export interface WikiPostDetail extends WikiPost {
    body: string;
}

export interface GetAllPostsOptions {
    sortBy?: "date" | "title";
    order?: "asc" | "desc";
}

export interface WikiCategory {
    title: string;
    slug: string;
    body: string;
    hasPosition: boolean;
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
