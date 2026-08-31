import type { Octokit } from "octokit";

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
    /** Commit author name — `makeCommitter` writes `"<name> (<uuid>)"`. */
    author: string;
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

/** Commits that touched a path, newest first. */
export async function listPathCommits(
    deps: FilesDeps,
    path: string,
    options?: { perPage?: number },
): Promise<PathCommit[]> {
    const { octokit, owner, repo } = deps;
    const { data } = await octokit.request(
        "GET /repos/{owner}/{repo}/commits",
        {
            owner,
            repo,
            path,
            per_page: options?.perPage ?? 50,
        },
    );
    return data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name ?? "Unknown",
        date: commit.commit.author?.date ?? "",
    }));
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
