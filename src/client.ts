import { listCategories } from "./content/categories.js";
import type { ContentContext, ContentPaths } from "./content/fetcher.js";
import { getPostBySlug, getPostByUuid, listPosts } from "./content/posts.js";
import { getCommitStatus } from "./github/checks.js";
import { type CommitFilesInput, commitFiles } from "./github/commit-files.js";
import {
    type AuthToken,
    createGitHubContextFactory,
} from "./github/octokit.js";
import { type SavePostInput, savePost } from "./posts/save.js";
import type {
    Category,
    CommitResult,
    CommitStatus,
    ListPostsOptions,
    Post,
    PostDetail,
} from "./types.js";

export type { AuthToken };

export interface HagakiConfig {
    github: {
        owner: string;
        repo: string;
        branch?: string;
        auth: AuthToken;
    };
    /**
     * Where the published content is served from. Required for every read
     * (`posts.list` / `posts.get*` / `categories.list`); write-only clients
     * can leave it out.
     */
    content?: {
        cdnBaseUrl: string;
        paths?: ContentPaths;
    };
    fetch?: typeof fetch;
}

export interface HagakiClient {
    posts: {
        list(options?: ListPostsOptions): Promise<Post[]>;
        getBySlug(slug: string): Promise<PostDetail | null>;
        getByUuid(uuid: string): Promise<PostDetail | null>;
        save(input: SavePostInput): Promise<CommitResult>;
    };
    categories: { list(): Promise<Category[]> };
    commits: {
        status(sha: string): Promise<CommitStatus>;
        /** Low-level escape hatch for arbitrary commits (category JSON, …). */
        commitFiles(input: CommitFilesInput): Promise<CommitResult>;
    };
}

export function createHagakiClient(config: HagakiConfig): HagakiClient {
    const fetchImpl: typeof fetch =
        config.fetch ?? globalThis.fetch.bind(globalThis);
    const githubContext = createGitHubContextFactory(config.github);

    function requireContent(): ContentContext {
        if (!config.content) {
            throw new Error(
                "hagaki: `content` config is required for content fetching",
            );
        }
        return { ...config.content, fetchImpl };
    }

    return {
        posts: {
            async list(options) {
                return listPosts(requireContent(), options);
            },
            async getBySlug(slug) {
                return getPostBySlug(requireContent(), slug);
            },
            async getByUuid(uuid) {
                return getPostByUuid(requireContent(), uuid);
            },
            async save(input) {
                return savePost(await githubContext(), input);
            },
        },
        categories: {
            async list() {
                return listCategories(requireContent());
            },
        },
        commits: {
            async status(sha) {
                return getCommitStatus(await githubContext(), sha);
            },
            async commitFiles(input) {
                return commitFiles(await githubContext(), input);
            },
        },
    };
}
