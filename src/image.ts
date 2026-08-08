/**
 * `hagaki/image` — image processing utilities.
 *
 *   - `analyzeImage` (browser-only): fast stage — decode a `File`, pick the
 *     output dimensions, and emit a blurhash so the editor can render a
 *     placeholder immediately.
 *   - `encodeAnalyzedImage` (browser-only): slow stage — AVIF-encode the
 *     analyzed bitmap via WASM in the background.
 *   - `validateAvifUpload` (isomorphic): cheap byte check before committing.
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
    type ProcessImageOptions,
} from "./image/pipeline.js";
export {
    ImageValidationError,
    type ImageValidationOptions,
    isAvif,
    validateAvifUpload,
} from "./image/validation.js";
