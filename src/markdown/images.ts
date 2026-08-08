import { extractImageDirectiveIds } from "./directive.js";

const IMG_REGEX = /!\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g;

export interface ImagePathConfig {
    /**
     * URL prefix as written in the markdown body, e.g. `"/img/"`. Used to
     * detect "this image belongs to my repo" references.
     */
    urlPrefix: string;
    /**
     * Matching directory inside the GitHub repository, e.g. `"content/img/"`.
     * Image URLs whose path lives under {@link urlPrefix} are translated to
     * paths under this directory.
     */
    repoDir: string;
}

function normalizePrefix(value: string): string {
    return value.endsWith("/") ? value : `${value}/`;
}

/**
 * Walk a markdown body and return the repository paths of every embedded
 * image the caller owns:
 *
 *   - legacy `![alt](url)` references whose URL lives under
 *     `config.urlPrefix` (external `http(s)://`, `data:` and session-local
 *     `pending:<id>` placeholders are skipped), and
 *   - `::img{id="<uuid>"}` directives, whose blobs live at
 *     `<repoDir><id>.avif` by convention.
 *
 * Useful for diff'ing the "before" and "after" of a post to figure out which
 * image blobs should be cleaned up when the post is saved.
 */
export function extractRepoImagePaths(
    markdown: string,
    config: ImagePathConfig,
): string[] {
    const urlPrefix = normalizePrefix(config.urlPrefix);
    const repoDir = normalizePrefix(config.repoDir);
    const paths = new Set<string>();
    for (const match of markdown.matchAll(IMG_REGEX)) {
        const url = match[1];
        if (!url || !url.startsWith(urlPrefix)) continue;
        const filename = url.slice(urlPrefix.length);
        if (!filename) continue;
        paths.add(`${repoDir}${filename}`);
    }
    for (const id of extractImageDirectiveIds(markdown)) {
        paths.add(`${repoDir}${id}.avif`);
    }
    return [...paths];
}

/**
 * Return the repo paths of images that were referenced by `oldBody` but no
 * longer appear in `newBody`. Designed to be piped into `commitFiles`'
 * `deletePaths` so the orphaned image blobs are removed in the same commit
 * that updates the post.
 */
export function diffRemovedImagePaths(
    oldBody: string,
    newBody: string,
    config: ImagePathConfig,
): string[] {
    const before = extractRepoImagePaths(oldBody, config);
    if (before.length === 0) return [];
    const after = new Set(extractRepoImagePaths(newBody, config));
    return before.filter((path) => !after.has(path));
}
