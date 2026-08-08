/**
 * `hagaki/image` — image processing utilities.
 *
 *   - `analyzeImage` (browser-only): fast stage — decode a `File`, pick the
 *     output dimensions, and emit a blurhash so the editor can render a
 *     placeholder immediately.
 *   - `encodeAnalyzedImage` (browser-only): slow stage — AVIF-encode the
 *     analyzed bitmap via WASM in the background.
 *   - `processImage` (browser-only): both stages chained for one-shot use.
 *   - `validateAvifUpload` (isomorphic): cheap byte check before committing.
 *   - `encodeImageTitle` / `decodeImageTitle` (isomorphic): read/write the
 *     `blurhash=..&w=..&h=..` blob stored in the markdown image title.
 *
 * The browser-only entries require `createImageBitmap`, `OffscreenCanvas`
 * (or a DOM `<canvas>`) and `@jsquash/avif`'s WASM. Cloudflare Workers SSR
 * does not provide these, so keep their call sites behind a client-only
 * boundary.
 */
export {
    type AnalyzedImage,
    analyzeImage,
    encodeAnalyzedImage,
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
