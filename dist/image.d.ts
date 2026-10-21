import { a as ProcessedImage, c as processImage, i as ProcessImageOptions, n as ImageProcessingError, o as analyzeImage, r as MAX_AVIF_BYTES, s as encodeAnalyzedImage, t as AnalyzedImage } from "./pipeline-BsBTLj-D.js";
//#region src/image/validation.d.ts
/**
 * Lightweight AVIF format / size validation. Pure JS — safe to call from any
 * runtime (browser, Cloudflare Workers, Node).
 */
/**
 * Confirm the bytes start with an ISO base media file `ftyp` box whose major
 * brand or compatible brand is "avif" (or "avis").
 */
export declare function isAvif(bytes: Uint8Array): boolean;
interface ImageValidationOptions {
  /** Maximum allowed byte length. Defaults to 500 KB. */
  maxBytes?: number;
}
export declare class ImageValidationError extends Error {
  readonly code: "size" | "format";
  constructor(message: string, code: "size" | "format");
}
export declare function validateAvifUpload(bytes: Uint8Array, options?: ImageValidationOptions): void;
//#endregion
export { type AnalyzedImage, ImageProcessingError, type ImageValidationOptions, MAX_AVIF_BYTES, type ProcessImageOptions, type ProcessedImage, analyzeImage, encodeAnalyzedImage, processImage };
//# sourceMappingURL=image.d.ts.map