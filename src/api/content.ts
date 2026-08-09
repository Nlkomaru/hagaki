import matter from "gray-matter";
import type {
    GetAllPostsOptions,
    ImportedEdit,
    WikiCategory,
    WikiPost,
    WikiPostDetail,
    WikiThumbnail,
} from "./types.js";

export interface ContentConfig {
    cdnBaseUrl: string;
    paths?: {
        /** Manifest listing every article (defaults to `/article.json`). */
        posts?: string;
        /** Manifest listing every category (defaults to `/categories.json`). */
        categories?: string;
        /** slug → uuid map (defaults to `/slug-index.json`). */
        slugIndex?: string;
        /**
         * Resolve a post's `index.mdx` URL given its directory uuid. Defaults
         * to `/article/<uuid>/index.mdx`.
         */
        postByUuid?: (uuid: string) => string;
        /**
         * Resolve a post's generated `info.json` URL given its directory
         * uuid. Defaults to `/article/<uuid>/info.json`.
         */
        postInfoByUuid?: (uuid: string) => string;
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
function slugIndexPath(c: ContentConfig): string {
    return c.paths?.slugIndex ?? "/slug-index.json";
}
function postByUuidPath(c: ContentConfig, uuid: string): string {
    const fn = c.paths?.postByUuid;
    if (fn) return fn(uuid);
    return `/article/${encodeURIComponent(uuid)}/index.mdx`;
}
function postInfoByUuidPath(c: ContentConfig, uuid: string): string {
    const fn = c.paths?.postInfoByUuid;
    if (fn) return fn(uuid);
    return `/article/${encodeURIComponent(uuid)}/info.json`;
}

function parseThumbnail(value: unknown): WikiThumbnail | null {
    if (typeof value !== "object" || value === null) return null;
    const { imageId, blurhash64 } = value as {
        imageId?: unknown;
        blurhash64?: unknown;
    };
    if (typeof imageId !== "string" || !imageId) return null;
    return {
        imageId,
        blurhash64: typeof blurhash64 === "string" ? blurhash64 : "",
    };
}

function toIsoDate(value: unknown): string | null {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string" && value) {
        const t = Date.parse(value);
        if (!Number.isNaN(t)) return new Date(t).toISOString();
    }
    return null;
}

function parseImportedEdits(value: unknown): ImportedEdit[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const edits: ImportedEdit[] = [];
    for (const raw of value) {
        if (typeof raw !== "object" || raw === null) continue;
        const { date, player } = raw as { date?: unknown; player?: unknown };
        const iso = toIsoDate(date);
        if (!iso || typeof player !== "string") continue;
        edits.push({ date: iso, player });
    }
    return edits.length > 0 ? edits : undefined;
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
        const dir = order === "asc" ? 1 : -1;
        posts.sort((a, b) => {
            if (sortBy === "title") return a.title.localeCompare(b.title) * dir;
            // `created` / `updated` are ISO 8601 — lexicographic order is
            // chronological. Posts without generated metadata sort last.
            const av = a[sortBy] ?? "";
            const bv = b[sortBy] ?? "";
            if (av === bv) return 0;
            if (!av) return 1;
            if (!bv) return -1;
            return av.localeCompare(bv) * dir;
        });
    }
    return posts;
}

/**
 * Load `index.mdx` (frontmatter + body) and the generated `info.json`
 * (created/updated derived from imported + git history) for one post. A
 * missing `info.json` — e.g. content served without the generate step — just
 * leaves `created`/`updated` as `null`.
 */
/**
 * Parse one `index.mdx` (frontmatter + body) into a post. Exposed so callers
 * that read the file from somewhere other than the CDN — e.g. the repository
 * itself, for an editor that must see not-yet-deployed changes — get the same
 * shape as `posts.getByUuid`.
 */
export function parsePostMarkdown(
    markdown: string,
    uuid: string,
    generated?: { created?: string | null; updated?: string | null },
): WikiPostDetail {
    const { data, content } = matter(markdown);
    return {
        title: (data.title as string | undefined) ?? "",
        slug: (data.slug as string | undefined) ?? "",
        uuid: (data.uuid as string | undefined) ?? uuid,
        description: (data.description as string | undefined) ?? "",
        category: (data.category as string | undefined) ?? "",
        thumbnail: parseThumbnail(data.thumbnail),
        created: toIsoDate(generated?.created),
        updated: toIsoDate(generated?.updated),
        modified: parseImportedEdits(data.modified),
        body: content,
    };
}

export async function getPostByUuid(
    deps: ContentFetcherDeps,
    uuid: string,
): Promise<WikiPostDetail | null> {
    const { config, fetchImpl } = deps;
    const [postRes, infoRes] = await Promise.all([
        fetchImpl(joinUrl(config.cdnBaseUrl, postByUuidPath(config, uuid))),
        fetchImpl(joinUrl(config.cdnBaseUrl, postInfoByUuidPath(config, uuid))),
    ]);
    if (!postRes.ok) return null;
    const markdown = await postRes.text();

    let created: string | null = null;
    let updated: string | null = null;
    if (infoRes.ok) {
        const info = (await infoRes.json()) as {
            created?: unknown;
            updated?: unknown;
        };
        created = toIsoDate(info.created);
        updated = toIsoDate(info.updated);
    }

    return parsePostMarkdown(markdown, uuid, { created, updated });
}

/**
 * Resolve a post by its human-facing slug via the generated
 * `slug-index.json` (O(1)), falling back to a manifest scan when the index
 * is missing. Returns `null` if no post has that slug.
 */
export async function getPostBySlug(
    deps: ContentFetcherDeps,
    slug: string,
): Promise<WikiPostDetail | null> {
    const url = joinUrl(deps.config.cdnBaseUrl, slugIndexPath(deps.config));
    const res = await deps.fetchImpl(url);
    if (res.ok) {
        const index = (await res.json()) as Record<string, string>;
        const uuid = index[slug];
        return uuid ? getPostByUuid(deps, uuid) : null;
    }
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
    categories.sort((a, b) => a.slug.localeCompare(b.slug));
    return categories;
}
