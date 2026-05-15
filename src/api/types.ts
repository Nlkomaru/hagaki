export interface WikiPost {
    title: string;
    slug: string;
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

export type WikiImageFile = string;

export interface SaveResult {
    commitSha: string;
    commitUrl: string;
    path: string;
}

export interface CommitWithChecks {
    commit: unknown;
    checks: unknown;
}
