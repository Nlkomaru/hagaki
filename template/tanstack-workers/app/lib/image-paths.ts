import { resolveCdnUrl } from "hagaki";
import type { HagakiImageUrlResolver } from "hagaki/react";

/**
 * Per-article image locations. Each post owns a directory
 * `content/article/<uuid>/`, so its images live under
 * `content/article/<uuid>/assets/` and are addressed in the markdown body by
 * a `::img{id="<file>"}` directive — the URL is resolved at render time from
 * `articleId` + `imageId`.
 */
export function articleAssetsRepoDir(uuid: string): string {
    return `content/article/${uuid}/assets/`;
}

/**
 * `<Image>` URL resolver for this app: images are served straight from the
 * content CDN (Workers Assets) under `/article/<uuid>/assets/<file>`.
 */
export function cdnImageUrlFor(cdnBaseUrl: string): HagakiImageUrlResolver {
    return ({ articleId, imageId }) =>
        resolveCdnUrl(`/article/${articleId}/assets/${imageId}`, cdnBaseUrl);
}
