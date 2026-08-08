/**
 * `hagaki/markdown` — the `<Image />` MDX component vocabulary and its
 * editing-time helpers.
 *
 * hagaki deliberately does NOT render markdown to HTML/React — that is the
 * consumer's job (remark/rehype, MDX, …). What lives here:
 *
 *   - `imageComponentMarkdown` / `extractImageComponentIds` /
 *     `parseImageComponentAttributes`: build and scan the
 *     `<Image imageId="<uuid>" blurHash=".." width=".." height=".." alt=".." />`
 *     MDX form (editors insert it, save flows use the id list to know which
 *     pending uploads to commit). Parsing is AST-based (remark-mdx), so code
 *     blocks and attribute forms are handled correctly. The prop names match
 *     `hagaki/react`'s `<Image>` — MDX renderers can just pass
 *     `components={{ Image }}`.
 *   - `extractRepoImagePaths` / `diffRemovedImagePaths`: repo paths of the
 *     images a body references / dropped between two body versions, for
 *     `commitFiles`' `deletePaths`.
 *   - `blurhashToDataUrl`: blurhash → `data:image/bmp` placeholder, for
 *     custom renderers that don't use `hagaki/react`'s `<Image>`.
 *
 * Pure JS — safe to call from a Cloudflare Workers loader, a Node server, or
 * the browser.
 */
export { blurhashToDataUrl } from "./markdown/blurhash-data-url.js";
export type {
    ImageComponentAttrs,
    MdxJsxAttributeLike,
} from "./markdown/image-jsx.js";
export {
    extractImageComponentIds,
    IMAGE_COMPONENT_NAME,
    imageComponentMarkdown,
    isImageComponentNode,
    parseImageComponentAttributes,
} from "./markdown/image-jsx.js";
export type { ImagePathConfig } from "./markdown/images.js";
export {
    diffRemovedImagePaths,
    extractRepoImagePaths,
} from "./markdown/images.js";
