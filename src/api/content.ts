import matter from "gray-matter";
import type {
    GetAllPostsOptions,
    WikiCategory,
    WikiPost,
    WikiPostDetail,
} from "./types.js";

export interface ContentConfig {
    cdnBaseUrl: string;
    paths?: {
        /** Manifest listing every article (defaults to `/article.json`). */
        posts?: string;
        /** Manifest listing every category (defaults to `/categories.json`). */
        categories?: string;
        /**
         * Resolve a post's `index.md` URL given its directory uuid. Defaults
         * to `/article/<uuid>/index.md`.
         */
        postByUuid?: (uuid: string) => string;
    };
}

export interface ContentFetcherDeps {
    config: ContentConfig;
    fetchImpl: typeof fetch;
}

function joinUrl(base: string, path: string): string {
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${b}${p}`;
}

function postsPath(c: ContentConfig): string {
    return c.paths?.posts ?? "/article.json";
}
function categoriesPath(c: ContentConfig): string {
    return c.paths?.categories ?? "/categories.json";
}
function postByUuidPath(c: ContentConfig, uuid: string): string {
    const fn = c.paths?.postByUuid;
    if (fn) return fn(uuid);
    return `/article/${encodeURIComponent(uuid)}/index.md`;
}

export async function listPosts(
    deps: ContentFetcherDeps,
    options?: GetAllPostsOptions,
): Promise<WikiPost[]> {
    const url = joinUrl(deps.config.cdnBaseUrl, postsPath(deps.config));
    const res = await deps.fetchImpl(url);
    if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
    const posts = (await res.json()) as WikiPost[];

    if (options?.sortBy) {
        const { sortBy, order = "desc" } = options;
        posts.sort((a, b) => {
            if (sortBy === "date") {
                return order === "asc"
                    ? new Date(a.date).getTime() - new Date(b.date).getTime()
                    : new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            if (sortBy === "title") {
                return order === "asc"
                    ? a.title.localeCompare(b.title)
                    : b.title.localeCompare(a.title);
            }
            return 0;
        });
    }
    return posts;
}

export async function getPostByUuid(
    deps: ContentFetcherDeps,
    uuid: string,
): Promise<WikiPostDetail | null> {
    const url = joinUrl(
        deps.config.cdnBaseUrl,
        postByUuidPath(deps.config, uuid),
    );
    const res = await deps.fetchImpl(url);
    if (!res.ok) return null;
    const markdown = await res.text();
    const { data, content } = matter(markdown);
    return {
        title: (data.title as string | undefined) ?? "",
        slug: (data.slug as string | undefined) ?? "",
        uuid: (data.uuid as string | undefined) ?? uuid,
        description: (data.description as string | undefined) ?? "",
        date: (data.date as string | undefined) ?? "",
        category: (data.category as string | undefined) ?? "",
        image: data.image as string | undefined,
        body: content,
    };
}

/**
 * Resolve a post by its human-facing slug. Fetches the article manifest,
 * looks up the matching uuid, then loads `/article/<uuid>/index.md`. Returns
 * `null` if no post has that slug.
 */
export async function getPostBySlug(
    deps: ContentFetcherDeps,
    slug: string,
): Promise<WikiPostDetail | null> {
    const posts = await listPosts(deps);
    const match = posts.find((p) => p.slug === slug);
    if (!match) return null;
    return getPostByUuid(deps, match.uuid);
}

export async function listCategories(
    deps: ContentFetcherDeps,
): Promise<WikiCategory[]> {
    const url = joinUrl(deps.config.cdnBaseUrl, categoriesPath(deps.config));
    const res = await deps.fetchImpl(url);
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
    const categories = (await res.json()) as WikiCategory[];
    categories.sort((a, b) => {
        if (a.hasPosition !== b.hasPosition) return a.hasPosition ? -1 : 1;
        return a.slug.localeCompare(b.slug);
    });
    return categories;
}
