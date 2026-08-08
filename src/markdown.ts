/**
 * `hagaki/markdown` — the `::img` directive vocabulary and its editing-time
 * helpers.
 *
 * hagaki deliberately does NOT render markdown to HTML/React — that is the
 * consumer's job (remark/rehype, MDX, …). What lives here:
 *
 *   - `imgDirective` / `replaceImgDirectives` / `extractImgDirectiveIds`:
 *     read and rewrite `::img{id=… blurhash=… w=… h=… alt=…}` directives in
 *     a markdown body (used by the save flow to resolve `pending:` uploads
 *     and to diff removed images).
 *   - `diffRemovedImagePaths`: repo paths of images dropped between two body
 *     versions, for `commitFiles`' `deletePaths`.
 *   - `blurhashToDataUrl`: blurhash → `data:image/bmp` placeholder, for
 *     custom renderers that don't use `hagaki/react`'s `<Image>`.
 *
 * Pure JS — safe to call from a Cloudflare Workers loader, a Node server, or
 * the browser.
 */
export { blurhashToDataUrl } from "./markdown/blurhash-data-url.js";
export type {
    ImagePathConfig,
    ImgDirectiveMeta,
} from "./markdown/img-directive.js";
export {
    diffRemovedImagePaths,
    extractImgDirectiveIds,
    imgDirective,
    imgDirectiveMetaFromAttrs,
    isPendingImageId,
    parseImgDirectiveAttrs,
    replaceImgDirectives,
} from "./markdown/img-directive.js";
