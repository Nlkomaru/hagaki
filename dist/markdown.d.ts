export { a as IMAGE_COMPONENT_NAME, I as ImageComponentAttrs, M as MdxJsxAttributeLike, e as extractImageComponentIds, i as imageComponentMarkdown, b as isImageComponentNode, p as parseImageComponentAttributes } from './image-jsx-DeaMXloi.js';

declare function blurhashToDataUrl(hash: string, width?: number, height?: number): string;

/**
 * Stored form of a blurhash: base64 of the raw hash.
 *
 * Raw blurhashes use the base83 charset, which includes `{`, `}`, `|`, `$`,
 * `%`, `@` — characters that need escaping (or get corrupted) in YAML
 * frontmatter and JSX string attributes. The content format therefore always
 * stores `blurhash64` / `blurHash64` (base64, safe everywhere) and decodes
 * back to the raw hash right before rendering.
 */
/** Encode a raw blurhash into its stored base64 form. */
declare function blurhashToBase64(raw: string): string;
/**
 * Decode the stored base64 form back to the raw blurhash. Returns `undefined`
 * for malformed input instead of throwing so callers can fall back to "no
 * placeholder".
 */
declare function blurhashFromBase64(encoded: string | null | undefined): string | undefined;

interface ImagePathConfig {
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
/**
 * Walk a markdown body and return the repository paths of every embedded
 * image the caller owns:
 *
 *   - legacy `![alt](url)` references whose URL lives under
 *     `config.urlPrefix` (external `http(s)://`, `data:` and session-local
 *     `pending:<id>` placeholders are skipped), and
 *   - `<Image imageId="<uuid>" />` MDX components, whose blobs live at
 *     `<repoDir><id>.avif` by convention.
 *
 * Useful for diff'ing the "before" and "after" of a post to figure out which
 * image blobs should be cleaned up when the post is saved.
 */
declare function extractRepoImagePaths(markdown: string, config: ImagePathConfig): string[];
/**
 * Return the repo paths of images that were referenced by `oldBody` but no
 * longer appear in `newBody`. Designed to be piped into `commitFiles`'
 * `deletePaths` so the orphaned image blobs are removed in the same commit
 * that updates the post.
 */
declare function diffRemovedImagePaths(oldBody: string, newBody: string, config: ImagePathConfig): string[];

export { type ImagePathConfig, blurhashFromBase64, blurhashToBase64, blurhashToDataUrl, diffRemovedImagePaths, extractRepoImagePaths };
