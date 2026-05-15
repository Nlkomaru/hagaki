import type { Octokit } from "octokit";
import type { Committer } from "../auth/index.js";
import type { SaveResult } from "./types.js";

export interface GitHubImageRepoConfig {
    owner: string;
    repo: string;
    branch: string;
    imagePath: string;
}

export interface SaveImageInput {
    filename: string;
    content: ArrayBuffer | Uint8Array | string;
    committer?: Committer;
    commitMessage?: string;
}

export interface SaveImageDeps {
    octokit: Octokit;
    repo: GitHubImageRepoConfig;
}

function toBase64(input: ArrayBuffer | Uint8Array | string): string {
    if (typeof input === "string") return input;
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

export async function saveImage(
    deps: SaveImageDeps,
    input: SaveImageInput,
): Promise<SaveResult> {
    const { octokit, repo } = deps;
    const filePath = `${repo.imagePath.replace(/\/$/, "")}/${input.filename}`;
    const contentEncoded = toBase64(input.content);

    let fileSha: string | undefined;
    try {
        const { data: fileData } = await octokit.rest.repos.getContent({
            owner: repo.owner,
            repo: repo.repo,
            path: filePath,
            ref: repo.branch,
        });
        if (!Array.isArray(fileData) && "sha" in fileData && fileData.sha) {
            fileSha = fileData.sha;
        }
    } catch (e) {
        if (
            typeof e === "object" &&
            e !== null &&
            "status" in e &&
            (e as { status?: number }).status !== 404
        ) {
            throw e;
        }
    }

    const committer = input.committer;
    const { data: commitData } =
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: repo.owner,
            repo: repo.repo,
            path: filePath,
            message: input.commitMessage ?? `Add image: ${input.filename}`,
            content: contentEncoded,
            branch: repo.branch,
            sha: fileSha,
            ...(committer && { committer, author: committer }),
        });

    return {
        commitSha: commitData.commit.sha ?? "",
        commitUrl: commitData.commit.html_url ?? "",
        path: filePath,
    };
}
