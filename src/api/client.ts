import { Octokit } from "octokit";
import { getCommitWithChecks } from "./commits.js";
import {
    type ContentConfig,
    getPostBySlug as fetchPostBySlug,
    listCategories,
    listImages,
    listPosts,
} from "./content.js";
import { type SaveImageInput, saveImage } from "./images.js";
import { type SavePostOptions, savePost } from "./posts.js";
import {
    type CommitFilesInput,
    type CommitFilesResult,
    commitFiles,
} from "./tree-commit.js";
import type {
    CommitWithChecks,
    GetAllPostsOptions,
    SaveResult,
    WikiCategory,
    WikiImageFile,
    WikiPost,
    WikiPostDetail,
} from "./types.js";

export type AuthToken = string | (() => string | Promise<string>);

export interface HagakiConfig {
    github: {
        owner: string;
        repo: string;
        branch?: string;
        contentPath?: string;
        imagePath?: string;
        auth: AuthToken;
    };
    content?: ContentConfig;
    fetch?: typeof fetch;
}

export interface HagakiClient {
    posts: {
        list(options?: GetAllPostsOptions): Promise<WikiPost[]>;
        getBySlug(slug: string): Promise<WikiPostDetail | null>;
        save(
            post: WikiPostDetail,
            options?: SavePostOptions,
        ): Promise<SaveResult>;
    };
    categories: { list(): Promise<WikiCategory[]> };
    images: {
        list(): Promise<WikiImageFile[]>;
        save(input: SaveImageInput): Promise<SaveResult>;
    };
    commits: {
        getWithChecks(sha: string): Promise<CommitWithChecks>;
        commitFiles(input: CommitFilesInput): Promise<CommitFilesResult>;
    };
}

async function resolveAuth(auth: AuthToken): Promise<string> {
    return typeof auth === "function" ? await auth() : auth;
}

export function createHagakiClient(config: HagakiConfig): HagakiClient {
    const branch = config.github.branch ?? "main";
    const contentPath = config.github.contentPath ?? "content/wiki";
    const imagePath = config.github.imagePath ?? "content/img";
    const fetchImpl: typeof fetch =
        config.fetch ?? globalThis.fetch.bind(globalThis);

    async function getOctokit(): Promise<Octokit> {
        const token = await resolveAuth(config.github.auth);
        return new Octokit({ auth: token });
    }

    function requireContent(): ContentConfig {
        if (!config.content) {
            throw new Error(
                "hagaki: `content` config is required for content fetching",
            );
        }
        return config.content;
    }

    return {
        posts: {
            async list(options) {
                return listPosts(
                    { config: requireContent(), fetchImpl },
                    options,
                );
            },
            async getBySlug(slug) {
                return fetchPostBySlug(
                    { config: requireContent(), fetchImpl },
                    slug,
                );
            },
            async save(post, options) {
                const octokit = await getOctokit();
                return savePost(
                    {
                        octokit,
                        repo: {
                            owner: config.github.owner,
                            repo: config.github.repo,
                            branch,
                            contentPath,
                        },
                    },
                    post,
                    options,
                );
            },
        },
        categories: {
            async list() {
                return listCategories({ config: requireContent(), fetchImpl });
            },
        },
        images: {
            async list() {
                return listImages({ config: requireContent(), fetchImpl });
            },
            async save(input) {
                const octokit = await getOctokit();
                return saveImage(
                    {
                        octokit,
                        repo: {
                            owner: config.github.owner,
                            repo: config.github.repo,
                            branch,
                            imagePath,
                        },
                    },
                    input,
                );
            },
        },
        commits: {
            async getWithChecks(sha) {
                const octokit = await getOctokit();
                return getCommitWithChecks(
                    {
                        octokit,
                        owner: config.github.owner,
                        repo: config.github.repo,
                    },
                    sha,
                );
            },
            async commitFiles(input) {
                const octokit = await getOctokit();
                return commitFiles(
                    {
                        octokit,
                        owner: config.github.owner,
                        repo: config.github.repo,
                        branch,
                    },
                    input,
                );
            },
        },
    };
}
