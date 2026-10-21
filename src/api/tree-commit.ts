import type { Octokit } from "octokit";
import type { Committer } from "../auth/index.js";

export interface CommitFile {
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

export interface CommitFilesInput {
    files?: CommitFile[];
    /**
     * Repository paths to remove in the same commit. Each path is recorded as
     * a null-sha entry in the new tree, which tells GitHub to drop it.
     */
    deletePaths?: string[];
    committer?: Committer;
    commitMessage: string;
}

export interface CommitFilesResult {
    commitSha: string;
    commitUrl: string;
    /** Added or updated paths. */
    paths: string[];
    /** Paths removed in this commit, if any. */
    deletedPaths: string[];
}

export interface CommitFilesDeps {
    octokit: Octokit;
    owner: string;
    repo: string;
    branch: string;
}

export function bytesToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

async function toBase64(file: CommitFile): Promise<string> {
    const { content } = file;
    if (typeof content === "string") {
        return file.encoding === "base64"
            ? content
            : bytesToBase64(new TextEncoder().encode(content));
    }
    if (content instanceof Uint8Array) return bytesToBase64(content);
    if (content instanceof ArrayBuffer) {
        return bytesToBase64(new Uint8Array(content));
    }
    return bytesToBase64(new Uint8Array(await content.arrayBuffer()));
}

/**
 * Commit multiple files as a single commit on the configured branch via the
 * GitHub Git Data API (blobs → tree → commit → updateRef). Use this when you
 * want atomicity (e.g. a markdown post + the images it references, or a post
 * update + the images it no longer references).
 */
export async function commitFiles(
    deps: CommitFilesDeps,
    input: CommitFilesInput,
): Promise<CommitFilesResult> {
    const { octokit, owner, repo, branch } = deps;
    const files = input.files ?? [];
    const deletePaths = dedupe(input.deletePaths ?? []);
    if (files.length === 0 && deletePaths.length === 0) {
        throw new Error(
            "commitFiles: at least one file or deletePath is required",
        );
    }

    const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`,
    });
    const baseCommitSha = refData.object.sha;

    const { data: baseCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: baseCommitSha,
    });
    const baseTreeSha = baseCommit.tree.sha;

    const blobs = await Promise.all(
        files.map(async (file) => {
            const { data } = await octokit.rest.git.createBlob({
                owner,
                repo,
                content: await toBase64(file),
                encoding: "base64",
            });
            return { path: file.path, sha: data.sha };
        }),
    );

    // GitHub's createTree treats a tree entry with `sha: null` as "delete this
    // path from the resulting tree". We cast because Octokit's generated type
    // wants `string` but the underlying API documents `null` as the delete
    // sentinel.
    const deleteEntries = deletePaths.map((path) => ({
        path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: null as unknown as string,
    }));

    const { data: tree } = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: [
            ...blobs.map((b) => ({
                path: b.path,
                mode: "100644" as const,
                type: "blob" as const,
                sha: b.sha,
            })),
            ...deleteEntries,
        ],
    });

    const committer = input.committer;
    const { data: commit } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: input.commitMessage,
        tree: tree.sha,
        parents: [baseCommitSha],
        ...(committer && { committer, author: committer }),
    });

    await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commit.sha,
    });

    return {
        commitSha: commit.sha,
        commitUrl: commit.html_url,
        paths: files.map((f) => f.path),
        deletedPaths: deletePaths,
    };
}

function dedupe(values: string[]): string[] {
    return Array.from(new Set(values));
}
