import type { Committer } from "../auth/index.js";
import type { CommitResult } from "../types.js";
import { bytesToBase64 } from "./base64.js";
import type { GitHubContext } from "./octokit.js";

export interface CommitFile {
    /** Repository path, e.g. `content/article/<uuid>/assets/abc.avif` */
    path: string;
    content: ArrayBuffer | Uint8Array | string;
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

function encodeContent(content: ArrayBuffer | Uint8Array | string): string {
    if (typeof content === "string") {
        return bytesToBase64(new TextEncoder().encode(content));
    }
    return bytesToBase64(content);
}

/**
 * Commit multiple files as a single commit on the configured branch via the
 * GitHub Git Data API (blobs → tree → commit → updateRef). Use this when you
 * want atomicity (e.g. a markdown post + the images it references, or a post
 * update + the images it no longer references).
 */
export async function commitFiles(
    ctx: GitHubContext,
    input: CommitFilesInput,
): Promise<CommitResult> {
    const { octokit, owner, repo, branch } = ctx;
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
                content: encodeContent(file.content),
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
