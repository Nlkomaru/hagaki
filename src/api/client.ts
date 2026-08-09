import { Octokit } from "octokit";
import { getCommitWithChecks } from "./commits.js";
import {
    type ContentConfig,
    getPostBySlug as fetchPostBySlug,
    getPostByUuid as fetchPostByUuid,
    listCategories,
    listPosts,
    parsePostMarkdown,
} from "./content.js";
import {
    fileExists,
    getFile,
    getPathDiff,
    listDirectory,
    listFilesRecursive,
    listPathCommits,
    type PathCommit,
    type RepoEntry,
    type RepoFile,
} from "./files.js";
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
        auth: AuthToken;
    };
    content?: ContentConfig;
    fetch?: typeof fetch;
}

export interface HagakiClient {
    posts: {
        list(options?: GetAllPostsOptions): Promise<WikiPost[]>;
        getBySlug(slug: string): Promise<WikiPostDetail | null>;
        getByUuid(uuid: string): Promise<WikiPostDetail | null>;
        /**
         * Read a post from the repository instead of the CDN, so an editor
         * sees commits that have not been deployed yet. Pass `ref` to read an
         * older revision. `created` / `updated` are `null` here — they come
         * from the generated `info.json`, which only the CDN has.
         */
        getFromRepo(
            uuid: string,
            options?: { ref?: string },
        ): Promise<WikiPostDetail | null>;
        /** Whether the post's `index.mdx` exists in the repository. */
        existsInRepo(uuid: string): Promise<boolean>;
        /** Every repository path belonging to a post (body + assets). */
        repoPaths(uuid: string): Promise<string[]>;
        /** Commits that touched the post's `index.mdx`, newest first. */
        history(
            uuid: string,
            options?: { perPage?: number },
        ): Promise<PathCommit[]>;
        /** Unified diff of the post body between two commits. */
        diff(uuid: string, base: string, head: string): Promise<string | null>;
        save(
            post: WikiPostDetail,
            options?: SavePostOptions,
        ): Promise<SaveResult>;
    };
    categories: { list(): Promise<WikiCategory[]> };
    /** Raw repository reads, for anything the CDN doesn't serve. */
    files: {
        get(path: string, ref?: string): Promise<RepoFile | null>;
        exists(path: string, ref?: string): Promise<boolean>;
        list(path: string, ref?: string): Promise<RepoEntry[]>;
        listRecursive(path: string, ref?: string): Promise<string[]>;
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
    const contentPath = config.github.contentPath ?? "content/article";
    const fetchImpl: typeof fetch =
        config.fetch ?? globalThis.fetch.bind(globalThis);

    async function getOctokit(): Promise<Octokit> {
        const token = await resolveAuth(config.github.auth);
        return new Octokit({ auth: token });
    }

    /** Repository path of a post's body. */
    function postPath(uuid: string): string {
        return `${contentPath}/${uuid}/index.mdx`;
    }

    async function filesDeps() {
        return {
            octokit: await getOctokit(),
            owner: config.github.owner,
            repo: config.github.repo,
            branch,
        };
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
            async getByUuid(uuid) {
                return fetchPostByUuid(
                    { config: requireContent(), fetchImpl },
                    uuid,
                );
            },
            async getFromRepo(uuid, options) {
                const file = await getFile(
                    await filesDeps(),
                    postPath(uuid),
                    options?.ref,
                );
                return file ? parsePostMarkdown(file.text, uuid) : null;
            },
            async existsInRepo(uuid) {
                return fileExists(await filesDeps(), postPath(uuid));
            },
            async repoPaths(uuid) {
                return listFilesRecursive(
                    await filesDeps(),
                    `${contentPath}/${uuid}`,
                );
            },
            async history(uuid, options) {
                return listPathCommits(
                    await filesDeps(),
                    postPath(uuid),
                    options,
                );
            },
            async diff(uuid, base, head) {
                return getPathDiff(
                    await filesDeps(),
                    postPath(uuid),
                    base,
                    head,
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
        files: {
            async get(path, ref) {
                return getFile(await filesDeps(), path, ref);
            },
            async exists(path, ref) {
                return fileExists(await filesDeps(), path, ref);
            },
            async list(path, ref) {
                return listDirectory(await filesDeps(), path, ref);
            },
            async listRecursive(path, ref) {
                return listFilesRecursive(await filesDeps(), path, ref);
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
