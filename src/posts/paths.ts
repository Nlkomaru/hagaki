/**
 * The single source of truth for the on-disk article layout. Every writer
 * (save flow, image upload) and every reader (markdown URL resolution) goes
 * through here — nothing else should build these strings by hand.
 */
export interface ArticlePaths {
    /** `content/article/<uuid>` */
    dir: string;
    /** `content/article/<uuid>/index.md` */
    indexPath: string;
    /** `content/article/<uuid>/assets` */
    assetsDir: string;
    /** `content/article/<uuid>/assets/<name>` */
    assetPath(name: string): string;
    /** URL prefix used in markdown / on the CDN: `/article/<uuid>/assets/` */
    assetUrlPrefix: string;
}

export function articlePaths(uuid: string): ArticlePaths {
    const dir = `content/article/${uuid}`;
    const assetsDir = `${dir}/assets`;
    return {
        dir,
        indexPath: `${dir}/index.md`,
        assetsDir,
        assetPath: (name: string) => `${assetsDir}/${name}`,
        assetUrlPrefix: `/article/${uuid}/assets/`,
    };
}
