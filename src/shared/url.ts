const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Resolve a markdown image / content URL against the configured CDN base.
 * Already-absolute URLs (`http://`, `https://`, `data:`, etc.) are returned
 * unchanged. An empty `cdnBaseUrl` is treated as a no-op so this helper can
 * be called unconditionally.
 */
export function resolveCdnUrl(src: string, cdnBaseUrl: string): string {
    if (ABSOLUTE_URL_PATTERN.test(src)) return src;
    if (!cdnBaseUrl) return src;
    const base = cdnBaseUrl.replace(/\/$/, "");
    const path = src.startsWith("/") ? src : `/${src}`;
    return `${base}${path}`;
}
