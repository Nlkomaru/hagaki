/**
 * `hagaki/markdown` — server-side markdown → HTML rendering with image
 * placeholder hydration.
 *
 *   - `markdownToHtml` runs remark + rehype, then walks the produced HTML
 *     and rewrites each `<img>` into a wrapping `<span>` that carries a
 *     `data:image/bmp` blurhash placeholder behind the real image and a
 *     CSS-only fade-in transition. Image titles of the form
 *     `blurhash=..&w=..&h=..` (as emitted by `hagaki/image` `encodeImageTitle`)
 *     are decoded automatically.
 *   - `blurhashToDataUrl` is exposed for callers that want to compute the
 *     placeholder data URL directly (e.g. for a custom renderer).
 *
 * Pure JS — safe to call from a Cloudflare Workers loader, a Node server, or
 * the browser.
 */
export { blurhashToDataUrl } from "./markdown/blurhash-data-url.js";
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
