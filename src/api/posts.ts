import matter from "gray-matter";
import type { Octokit } from "octokit";
import type { Committer } from "../auth/index.js";
import type { SaveResult, WikiPostDetail } from "./types.js";

export interface GitHubRepoConfig {
    owner: string;
    repo: string;
    branch: string;
    /**
     * Repo directory holding article subdirectories. Each article lives at
     * `${contentPath}/<uuid>/index.mdx`. Defaults to `content/article`.
     */
    contentPath: string;
}

export interface SavePostOptions {
    committer?: Committer;
    commitMessage?: string;
}

export interface SavePostDeps {
    octokit: Octokit;
    repo: GitHubRepoConfig;
}

function toBase64(input: string): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(input, "utf-8").toString("base64");
    }
    // Edge / browser fallback
    const bytes = new TextEncoder().encode(input);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    // btoa exists in browsers and Workers
    return btoa(bin);
}

export async function savePost(
    deps: SavePostDeps,
    form: WikiPostDetail,
    options?: SavePostOptions,
): Promise<SaveResult> {
    const { octokit, repo } = deps;
    if (!form.uuid) {
        throw new Error(
            "savePost: WikiPostDetail.uuid is required — generate one before saving",
        );
    }
    const filePath = `${repo.contentPath.replace(/\/$/, "")}/${form.uuid}/index.mdx`;

    const content = matter.stringify(form.body || "", {
        title: form.title,
        slug: form.slug,
        uuid: form.uuid,
        category: form.category,
        description: form.description,
        // Optional fields are omitted, not written as null/empty.
        ...(form.thumbnail ? { thumbnail: form.thumbnail } : {}),
        ...(form.modified && form.modified.length > 0
            ? { modified: form.modified }
            : {}),
    });
    const contentEncoded = toBase64(content);

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

    const committer = options?.committer;
    const { data: commitData } =
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: repo.owner,
            repo: repo.repo,
            path: filePath,
            message:
                // gitmoji: 📝 = add/update content.
                options?.commitMessage ?? `📝 Update post: ${form.slug}`,
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
