/**
 * `hagaki/image` — image processing utilities.
 *
 *   - `processImage` (browser-only): decode a `File`, resize, encode AVIF
 *     via WASM, and emit a blurhash. Use inside `onImageUpload`.
 *   - `validateAvifUpload` (isomorphic): cheap byte check before committing.
 *   - `encodeImageTitle` / `decodeImageTitle` (isomorphic): read/write the
 *     `blurhash=..&w=..&h=..` blob stored in the markdown image title.
 *
 * `processImage` requires `createImageBitmap`, `OffscreenCanvas` (or a DOM
 * `<canvas>`) and `@jsquash/avif`'s WASM. Cloudflare Workers SSR does not
 * provide these, so keep its call sites behind a client-only boundary.
 */
export {
    ImageProcessingError,
    MAX_AVIF_BYTES,
    type ProcessedImage,
    type ProcessImageOptions,
    processImage,
} from "./image/pipeline.js";
export type { ImageMeta } from "./image/title.js";
export { decodeImageTitle, encodeImageTitle } from "./image/title.js";
export {
    ImageValidationError,
    type ImageValidationOptions,
    isAvif,
    validateAvifUpload,
} from "./image/validation.js";
