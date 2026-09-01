/**
 * Browser-only image processing pipeline, split in two stages:
 *   1. `analyzeImage`: File → bitmap → output dimensions + blurhash
 *      (4x4 components) — fast, so the editor can show a placeholder early
 *   2. `encodeAnalyzedImage`: bitmap → resize → AVIF encode (WASM via
 *      @jsquash/avif) — slow, runs in the background
 * `processImage` chains both for callers that want the one-shot result.
 *
 * Relies on `createImageBitmap`, `OffscreenCanvas`/`HTMLCanvasElement`, and
 * the AVIF WASM module — none of which exist in Cloudflare Workers SSR, so
 * keep this entry behind the editor's client-only boundary.
 */
declare const MAX_AVIF_BYTES: number;
interface ProcessedImage {
    avif: Uint8Array;
    blurhash: string;
    width: number;
    height: number;
    originalName: string;
    originalType: string;
}
declare class ImageProcessingError extends Error {
    readonly code: "decode-failed" | "encode-failed" | "too-large" | "blurhash-failed";
    constructor(message: string, code: "decode-failed" | "encode-failed" | "too-large" | "blurhash-failed");
}
interface ProcessImageOptions {
    /** Long-edge clamp before AVIF encode. Defaults to 1920. */
    maxDimension?: number;
    /** AVIF quality 0–100. Defaults to 50. */
    quality?: number;
    /** Hard cap on the encoded byte length. Defaults to 500 KB. */
    maxBytes?: number;
}
interface AnalyzedImage {
    blurhash: string;
    /** Target AVIF output width (after the long-edge clamp). */
    width: number;
    /** Target AVIF output height (after the long-edge clamp). */
    height: number;
    /**
     * Decoded source bitmap, handed off to {@link encodeAnalyzedImage} which
     * closes it when done. Callers must not close it themselves.
     */
    bitmap: ImageBitmap;
    originalName: string;
    originalType: string;
}
/**
 * Fast first stage: decode the file, pick the output dimensions, and compute
 * the blurhash — everything needed to show a placeholder in the editor before
 * the (slow) AVIF encode has even started.
 */
declare function analyzeImage(file: File, options?: ProcessImageOptions): Promise<AnalyzedImage>;
/**
 * Slow second stage: AVIF-encode the analyzed bitmap and enforce the byte
 * cap. Closes `analyzed.bitmap` when it finishes (success or failure).
 */
declare function encodeAnalyzedImage(analyzed: AnalyzedImage, options?: ProcessImageOptions): Promise<Uint8Array>;
declare function processImage(file: File, options?: ProcessImageOptions): Promise<ProcessedImage>;

export { type AnalyzedImage as A, ImageProcessingError as I, MAX_AVIF_BYTES as M, type ProcessImageOptions as P, type ProcessedImage as a, analyzeImage as b, encodeAnalyzedImage as e, processImage as p };
