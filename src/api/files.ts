import type { Octokit } from "octokit";
import { userIdFromCommitterName } from "../auth/index.js";

/**
 * Repository reads that the CDN can't serve: the working state of a file on a
 * branch (including changes committed but not deployed yet), directory
 * listings, and per-path commit history / diffs.
 *
 * `posts.*` reads published content from the CDN; these read the repository
 * itself, which is what an editor needs.
 */
export interface FilesDeps {
    octokit: Octokit;
    owner: string;
    repo: string;
    branch: string;
}

export interface RepoFile {
    path: string;
    /** UTF-8 decoded contents. */
    text: string;
    /** Blob sha of this version. */
    sha: string;
}

export interface RepoEntry {
    path: string;
    name: string;
    type: "file" | "dir";
    sha: string;
    size: number;
}

export interface PathCommit {
    sha: string;
    message: string;
    /** Commit author name — `makeCommitter` writes `"<name> (<id>)"`. */
    author: string;
    /**
     * Auth user id recovered from {@link author} (`userIdFromCommitterName`);
     * `null` when the name isn't in the convention.
     */
    userId: string | null;
    date: string;
}

function decodeBase64(content: string): string {
    const normalized = content.replace(/\n/g, "");
    if (typeof Buffer !== "undefined") {
        return Buffer.from(normalized, "base64").toString("utf-8");
    }
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

/** Read one file from the repository. `null` when it does not exist. */
export async function getFile(
    deps: FilesDeps,
    path: string,
    ref?: string,
): Promise<RepoFile | null> {
    const { octokit, owner, repo, branch } = deps;
    try {
        const { data } = await octokit.request(
            "GET /repos/{owner}/{repo}/contents/{path}",
            { owner, repo, path, ref: ref ?? branch },
        );
        if (Array.isArray(data) || data.type !== "file") return null;
        return {
            path: data.path,
            text: decodeBase64(data.content),
            sha: data.sha,
        };
    } catch {
        return null;
    }
}

/**
 * Read one file's raw bytes from the repository — for binary content
 * (images) that {@link getFile}'s UTF-8 decoding would corrupt. `null` when
 * it does not exist. The contents API only inlines files up to 1MB; larger
 * blobs return `null`.
 */
export async function getBinaryFile(
    deps: FilesDeps,
    path: string,
    ref?: string,
): Promise<Uint8Array | null> {
    const { octokit, owner, repo, branch } = deps;
    try {
        const { data } = await octokit.request(
            "GET /repos/{owner}/{repo}/contents/{path}",
            { owner, repo, path, ref: ref ?? branch },
        );
        if (Array.isArray(data) || data.type !== "file" || !data.content) {
            return null;
        }
        const normalized = data.content.replace(/\n/g, "");
        if (typeof Buffer !== "undefined") {
            return new Uint8Array(Buffer.from(normalized, "base64"));
        }
        const binary = atob(normalized);
        return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    } catch {
        return null;
    }
}

/** Whether a path exists on the branch (or at `ref`). */
export async function fileExists(
    deps: FilesDeps,
    path: string,
    ref?: string,
): Promise<boolean> {
    const { octokit, owner, repo, branch } = deps;
    try {
        await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
            owner,
            repo,
            path,
            ref: ref ?? branch,
        });
        return true;
    } catch {
        return false;
    }
}

/** List one directory. Empty when the path is missing or is a file. */
export async function listDirectory(
    deps: FilesDeps,
    path: string,
    ref?: string,
): Promise<RepoEntry[]> {
    const { octokit, owner, repo, branch } = deps;
    try {
        const { data } = await octokit.request(
            "GET /repos/{owner}/{repo}/contents/{path}",
            { owner, repo, path, ref: ref ?? branch },
        );
        if (!Array.isArray(data)) return [];
        return data
            .filter((e) => e.type === "file" || e.type === "dir")
            .map((e) => ({
                path: e.path,
                name: e.name,
                type: e.type as "file" | "dir",
                sha: e.sha,
                size: e.size ?? 0,
            }));
    } catch {
        return [];
    }
}

/**
 * Every file under a directory, recursively — the paths you need to hand to
 * `commitFiles({ deletePaths })` to remove an article with its assets.
 */
export async function listFilesRecursive(
    deps: FilesDeps,
    path: string,
    ref?: string,
): Promise<string[]> {
    const entries = await listDirectory(deps, path, ref);
    const paths: string[] = [];
    for (const entry of entries) {
        if (entry.type === "file") {
            paths.push(entry.path);
        } else {
            paths.push(...(await listFilesRecursive(deps, entry.path, ref)));
        }
    }
    return paths;
}

/**
 * Every blob path in the repository at the branch tip, in one API call
 * (`git/trees?recursive=1`) — unlike {@link listFilesRecursive}, which walks
 * the contents API one directory at a time. Use this to enumerate articles.
 *
 * GitHub truncates the listing for very large trees (`truncated: true`); a
 * warning is logged when that happens.
 */
export async function listTreePaths(deps: FilesDeps): Promise<string[]> {
    const { octokit, owner, repo, branch } = deps;
    const { data } = await octokit.request(
        "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
        { owner, repo, tree_sha: branch, recursive: "1" },
    );
    if (data.truncated) {
        console.warn(
            "hagaki: git tree listing was truncated by GitHub — some paths are missing",
        );
    }
    return data.tree
        .filter((e) => e.type === "blob" && typeof e.path === "string")
        .map((e) => e.path as string);
}

/** Paging for {@link listPathCommits}, passed through to the commits API. */
export interface PathCommitsOptions {
    /** Commits per page (GitHub caps it at 100). Default 50. */
    perPage?: number;
    /** 1-based page number. Default 1 (the newest commits). */
    page?: number;
}

/** Shape of one item of `GET /repos/{owner}/{repo}/commits` we read. */
interface ApiCommit {
    sha: string;
    commit: {
        message: string;
        author?: { name?: string; date?: string } | null;
    };
}

function toPathCommit(commit: ApiCommit): PathCommit {
    const author = commit.commit.author?.name ?? "Unknown";
    return {
        sha: commit.sha,
        message: commit.commit.message,
        author,
        userId: userIdFromCommitterName(author),
        date: commit.commit.author?.date ?? "",
    };
}

/**
 * Page number of the `rel="last"` link in a GitHub `Link` header, or `null`
 * when there is none (the current page is the only / last one).
 */
function lastPageFromLinkHeader(link: string | undefined): number | null {
    if (!link) return null;
    for (const part of link.split(",")) {
        if (!/rel="last"/.test(part)) continue;
        // `[?&]page=` so the `per_page=` parameter never matches.
        const page = /<[^>]*[?&]page=(\d+)[^>]*>/.exec(part)?.[1];
        return page ? Number(page) : null;
    }
    return null;
}

/** Commits that touched a path, newest first. */
export async function listPathCommits(
    deps: FilesDeps,
    path: string,
    options?: PathCommitsOptions,
): Promise<PathCommit[]> {
    const { octokit, owner, repo, branch } = deps;
    const { data } = await octokit.request(
        "GET /repos/{owner}/{repo}/commits",
        {
            owner,
            repo,
            // Walk the configured branch, not the repository's default one.
            sha: branch,
            path,
            per_page: options?.perPage ?? 50,
            ...(options?.page ? { page: options.page } : {}),
        },
    );
    return data.map(toPathCommit);
}

/**
 * The oldest commit that touched a path — typically the one that created it —
 * or `null` when no commit did. Works for any history length in at most two
 * requests: list the path's commits one per page, read the `rel="last"` page
 * number from the `Link` header, and fetch that page. Without a `Link` header
 * the path has a single commit, which is already the oldest.
 *
 * Both requests list the configured branch, and the second is pinned to the
 * head commit the first one returned, so a commit landing in between can't
 * shift the page count.
 *
 * Like {@link listPathCommits} this follows GitHub's path history, so renames
 * are not followed: a file moved into `path` starts at the move.
 */
export async function getFirstPathCommit(
    deps: FilesDeps,
    path: string,
): Promise<PathCommit | null> {
    const { octokit, owner, repo, branch } = deps;
    const first = await octokit.request("GET /repos/{owner}/{repo}/commits", {
        owner,
        repo,
        // Walk the configured branch, not the repository's default one.
        sha: branch,
        path,
        per_page: 1,
    });
    const newest = first.data[0];
    if (!newest) return null;

    const lastPage = lastPageFromLinkHeader(first.headers.link);
    if (lastPage === null || lastPage <= 1) return toPathCommit(newest);

    // Pin the second request to the head the first one saw. Listing from the
    // branch again would count a commit that landed in between, and page
    // `lastPage` would then hold the second-oldest commit instead.
    const last = await octokit.request("GET /repos/{owner}/{repo}/commits", {
        owner,
        repo,
        sha: newest.sha,
        path,
        per_page: 1,
        page: lastPage,
    });
    const oldest = last.data[0];
    return oldest ? toPathCommit(oldest) : null;
}

/**
 * Unified diff of one path between two commits. `null` when the path did not
 * change between them (GitHub omits unchanged files from the comparison).
 */
export async function getPathDiff(
    deps: FilesDeps,
    path: string,
    base: string,
    head: string,
): Promise<string | null> {
    const { octokit, owner, repo } = deps;
    const { data } = await octokit.request(
        "GET /repos/{owner}/{repo}/compare/{basehead}",
        { owner, repo, basehead: `${base}...${head}` },
    );
    const file = data.files?.find((f) => f.filename === path);
    return file?.patch ?? null;
}
