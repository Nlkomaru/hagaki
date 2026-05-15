const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

export function resolveImageUrl(src: string, cdnBaseUrl: string): string {
    if (ABSOLUTE_URL_PATTERN.test(src)) return src;
    if (!cdnBaseUrl) return src;

    const base = cdnBaseUrl.replace(/\/$/, "");
    const path = src.startsWith("/") ? src : `/${src}`;
    return `${base}${path}`;
}
