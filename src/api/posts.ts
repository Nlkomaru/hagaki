import matter from "gray-matter";
import type { Octokit } from "octokit";
import type { Committer } from "../auth/index.js";
import { parseEditorList } from "./content.js";
import { bytesToBase64, type CommitFile, commitFiles } from "./tree-commit.js";
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
    /**
     * Extra files to write in the same commit — typically the images inserted
     * while the post was being written (`collectPendingImages` from
     * `hagaki/pending-images`, sent by the browser as `Blob`s or base64).
     * Supplying these (or {@link deletePaths}) switches the save to a tree
     * commit so the post and its assets land together.
     */
    files?: CommitFile[];
    /** Repository paths to remove in the same commit. */
    deletePaths?: string[];
}

export interface SavePostDeps {
    octokit: Octokit;
    repo: GitHubRepoConfig;
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

    // Normalized the same way as on read, so the stored list stays clean.
    const editor = parseEditorList(form.editor);
    const content = matter.stringify(form.body || "", {
        title: form.title,
        slug: form.slug,
        uuid: form.uuid,
        category: form.category,
        description: form.description,
        // Optional fields are omitted, not written as null/empty.
        ...(form.thumbnail ? { thumbnail: form.thumbnail } : {}),
        ...(form.option && Object.keys(form.option).length > 0
            ? { option: form.option }
            : {}),
        ...(form.modified && form.modified.length > 0
            ? { modified: form.modified }
            : {}),
        ...(form.draft ? { draft: true } : {}),
        ...(editor ? { editor } : {}),
    });

    // Assets to add or remove alongside the post can only be expressed as a
    // tree commit; the contents API writes one path at a time.
    const extraFiles = options?.files ?? [];
    const deletePaths = options?.deletePaths ?? [];
    if (extraFiles.length > 0 || deletePaths.length > 0) {
        const result = await commitFiles(
            {
                octokit,
                owner: repo.owner,
                repo: repo.repo,
                branch: repo.branch,
            },
            {
                files: [...extraFiles, { path: filePath, content }],
                deletePaths,
                committer: options?.committer,
                // gitmoji: 📝 = add/update content.
                commitMessage:
                    options?.commitMessage ?? `📝 Update post: ${form.slug}`,
            },
        );
        return {
            commitSha: result.commitSha,
            commitUrl: result.commitUrl,
            path: filePath,
        };
    }

    const contentEncoded = bytesToBase64(new TextEncoder().encode(content));

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
