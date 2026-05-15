import type { Octokit } from "octokit";
import type { Committer } from "../auth/index.js";

export interface CommitFile {
    /** Repository path, e.g. `content/img/abc.avif` or `content/wiki/hello.md` */
    path: string;
    content: ArrayBuffer | Uint8Array | string;
}

export interface CommitFilesInput {
    files: CommitFile[];
    committer?: Committer;
    commitMessage: string;
}

export interface CommitFilesResult {
    commitSha: string;
    commitUrl: string;
    paths: string[];
}

export interface CommitFilesDeps {
    octokit: Octokit;
    owner: string;
    repo: string;
    branch: string;
}

function toBase64(input: ArrayBuffer | Uint8Array | string): string {
    if (typeof input === "string") {
        if (typeof Buffer !== "undefined") {
            return Buffer.from(input, "utf-8").toString("base64");
        }
        return btoa(unescape(encodeURIComponent(input)));
    }
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

/**
 * Commit multiple files as a single commit on the configured branch via the
 * GitHub Git Data API (blobs → tree → commit → updateRef). Use this when you
 * want atomicity (e.g. a markdown post + the images it references).
 */
export async function commitFiles(
    deps: CommitFilesDeps,
    input: CommitFilesInput,
): Promise<CommitFilesResult> {
    const { octokit, owner, repo, branch } = deps;
    if (input.files.length === 0) {
        throw new Error("commitFiles: at least one file is required");
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
        input.files.map(async (file) => {
            const { data } = await octokit.rest.git.createBlob({
                owner,
                repo,
                content: toBase64(file.content),
                encoding: "base64",
            });
            return { path: file.path, sha: data.sha };
        }),
    );

    const { data: tree } = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: blobs.map((b) => ({
            path: b.path,
            mode: "100644",
            type: "blob",
            sha: b.sha,
        })),
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
        paths: input.files.map((f) => f.path),
    };
}
