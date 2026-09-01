export { A as AnalyzedImage, I as ImageProcessingError, M as MAX_AVIF_BYTES, P as ProcessImageOptions, a as ProcessedImage, b as analyzeImage, e as encodeAnalyzedImage, p as processImage } from './pipeline-6kF6pdR8.js';

/**
 * Lightweight AVIF format / size validation. Pure JS — safe to call from any
 * runtime (browser, Cloudflare Workers, Node).
 */
/**
 * Confirm the bytes start with an ISO base media file `ftyp` box whose major
 * brand or compatible brand is "avif" (or "avis").
 */
declare function isAvif(bytes: Uint8Array): boolean;
interface ImageValidationOptions {
    /** Maximum allowed byte length. Defaults to 500 KB. */
    maxBytes?: number;
}
declare class ImageValidationError extends Error {
    readonly code: "size" | "format";
    constructor(message: string, code: "size" | "format");
}
declare function validateAvifUpload(bytes: Uint8Array, options?: ImageValidationOptions): void;

export { ImageValidationError, type ImageValidationOptions, isAvif, validateAvifUpload };
