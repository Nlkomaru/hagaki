/**
 * `hagaki/markdown` — the `::img` directive vocabulary and its editing-time
 * helpers.
 *
 * hagaki deliberately does NOT render markdown to HTML/React — that is the
 * consumer's job (remark/rehype, MDX, …). What lives here:
 *
 *   - `imageDirectiveMarkdown` / `extractImageDirectiveIds` /
 *     `parseImageDirectiveAttributes`: build and scan the
 *     `::img{id="<uuid>" blurhash=".." w=".." h=".." alt=".."}` directive
 *     form (editors insert it, save flows use the id list to know which
 *     pending uploads to commit). Parsing is AST-based (remark-directive),
 *     so the `#<uuid>` id shortcut and code blocks are handled correctly.
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
export type { ImageDirectiveAttrs } from "./markdown/directive.js";
export {
    extractImageDirectiveIds,
    IMAGE_DIRECTIVE_NAME,
    imageDirectiveMarkdown,
    parseImageDirectiveAttributes,
} from "./markdown/directive.js";
export type { ImagePathConfig } from "./markdown/images.js";
export {
    diffRemovedImagePaths,
    extractRepoImagePaths,
} from "./markdown/images.js";
