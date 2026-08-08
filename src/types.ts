export interface Post {
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

export interface PostDetail extends Post {
    body: string;
}

export interface ListPostsOptions {
    sortBy?: "date" | "title";
    order?: "asc" | "desc";
}

export interface Category {
    title: string;
    slug: string;
    body: string;
    hasPosition: boolean;
}

export interface CommitResult {
    commitSha: string;
    commitUrl: string;
    /** Added or updated paths. */
    paths: string[];
    /** Paths removed in this commit, if any. */
    deletedPaths: string[];
}

export interface CheckRun {
    name: string;
    status: "queued" | "in_progress" | "completed";
    conclusion:
        | "success"
        | "failure"
        | "neutral"
        | "cancelled"
        | "skipped"
        | "timed_out"
        | "action_required"
        | null;
    detailsUrl: string | null;
}

export interface CommitStatus {
    sha: string;
    message: string;
    htmlUrl: string;
    /** Git author name recorded in the commit (not the GitHub account). */
    authorName: string | null;
    /** ISO timestamp of the git author date. */
    authoredAt: string | null;
    checks: CheckRun[];
    /**
     * Aggregate of `checks`: `"failure"` when any run failed/was cancelled/
     * timed out/needs action, otherwise `"pending"` while any run is
     * incomplete, otherwise `"success"`. `"none"` when there are no checks.
     */
    state: "pending" | "success" | "failure" | "none";
}
