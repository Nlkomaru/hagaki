import type { ImagePathConfig } from "hagaki/markdown";

/**
 * Per-article image locations. Each post owns a directory
 * `content/article/<uuid>/`, so its images live under
 * `content/article/<uuid>/assets/` and are referenced in the markdown body
 * as `/article/<uuid>/assets/<file>`.
 *
 * Used by the upload flow (writes these paths) and by the save flow (diffs
 * them to figure out which blobs to delete).
 */
export function imagePathsFor(uuid: string): ImagePathConfig {
    return {
        urlPrefix: `/article/${uuid}/assets/`,
        repoDir: `content/article/${uuid}/assets/`,
    };
}
