/**
 * `hagaki/markdown` — server-side markdown → HTML rendering with image
 * placeholder hydration.
 *
 *   - `markdownToHtml` runs remark + rehype and renders every image as a
 *     `<span data-hagaki-img>` wrapper that carries a `data:image/bmp`
 *     blurhash placeholder behind the real image and a CSS-only fade-in
 *     transition. Two source forms are supported:
 *       - `::img{id="<uuid>" blurhash=".." w=".." h=".." alt=".."}` leaf
 *         directives — the display URL is resolved through the
 *         `imageUrlFor` option;
 *       - legacy `![alt](url "blurhash=..&w=..&h=..")` images (titles as
 *         emitted by `hagaki/image` `encodeImageTitle`), resolved against
 *         the configured CDN base.
 *   - `imageDirectiveMarkdown` / `extractImageDirectiveIds` build and scan
 *     the `::img` directive form (editors insert it, save flows use the id
 *     list to know which pending uploads to commit).
 *   - `blurhashToDataUrl` is exposed for callers that want to compute the
 *     placeholder data URL directly (e.g. for a custom renderer).
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
export type {
    HydrateImagesOptions,
    MarkdownToHtmlOptions,
} from "./markdown/to-html.js";
export { markdownToHtml } from "./markdown/to-html.js";
