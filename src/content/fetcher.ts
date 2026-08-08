export interface ContentPaths {
    /** Manifest listing every article (defaults to `/article.json`). */
    posts?: string;
    /** Manifest listing every category (defaults to `/categories.json`). */
    categories?: string;
    /**
     * Resolve a post's `index.md` URL given its directory uuid. Defaults to
     * `/article/<uuid>/index.md`.
     */
    postByUuid?: (uuid: string) => string;
}

/**
 * Everything the read-only content helpers need: where the published content
 * lives and how to fetch it.
 */
export interface ContentContext {
    cdnBaseUrl: string;
    paths?: ContentPaths;
    fetchImpl: typeof fetch;
}

export function joinUrl(base: string, path: string): string {
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${b}${p}`;
}

export function postsUrl(ctx: ContentContext): string {
    return joinUrl(ctx.cdnBaseUrl, ctx.paths?.posts ?? "/article.json");
}

export function categoriesUrl(ctx: ContentContext): string {
    return joinUrl(ctx.cdnBaseUrl, ctx.paths?.categories ?? "/categories.json");
}

export function postByUuidUrl(ctx: ContentContext, uuid: string): string {
    const path =
        ctx.paths?.postByUuid?.(uuid) ??
        `/article/${encodeURIComponent(uuid)}/index.md`;
    return joinUrl(ctx.cdnBaseUrl, path);
}
