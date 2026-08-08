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

import encode from "@jsquash/avif/encode";
import { encode as encodeBlurhash } from "blurhash";

const MAX_IMAGE_DIMENSION = 1920;
const AVIF_QUALITY = 50;
const AVIF_SPEED = 6;
const BLURHASH_MAX_DIMENSION = 32;
const BLURHASH_X_COMPONENTS = 4;
const BLURHASH_Y_COMPONENTS = 4;

export const MAX_AVIF_BYTES = 500 * 1024;

export interface ProcessedImage {
    avif: Uint8Array;
    blurhash: string;
    width: number;
    height: number;
    originalName: string;
    originalType: string;
}

export class ImageProcessingError extends Error {
    constructor(
        message: string,
        readonly code:
            | "decode-failed"
            | "encode-failed"
            | "too-large"
            | "blurhash-failed",
    ) {
        super(message);
        this.name = "ImageProcessingError";
    }
}

export interface ProcessImageOptions {
    /** Long-edge clamp before AVIF encode. Defaults to 1920. */
    maxDimension?: number;
    /** AVIF quality 0–100. Defaults to 50. */
    quality?: number;
    /** Hard cap on the encoded byte length. Defaults to 500 KB. */
    maxBytes?: number;
}

export interface AnalyzedImage {
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
export async function analyzeImage(
    file: File,
    options?: ProcessImageOptions,
): Promise<AnalyzedImage> {
    const maxDimension = options?.maxDimension ?? MAX_IMAGE_DIMENSION;

    const bitmap = await loadBitmap(file);
    try {
        const { width, height } = fitDimensions(
            bitmap.width,
            bitmap.height,
            maxDimension,
        );
        const blurhash = await makeBlurhash(bitmap);
        return {
            blurhash,
            width,
            height,
            bitmap,
            originalName: file.name,
            originalType: file.type,
        };
    } catch (e) {
        bitmap.close?.();
        throw e;
    }
}

/**
 * Slow second stage: AVIF-encode the analyzed bitmap and enforce the byte
 * cap. Closes `analyzed.bitmap` when it finishes (success or failure).
 */
export async function encodeAnalyzedImage(
    analyzed: AnalyzedImage,
    options?: ProcessImageOptions,
): Promise<Uint8Array> {
    const quality = options?.quality ?? AVIF_QUALITY;
    const maxBytes = options?.maxBytes ?? MAX_AVIF_BYTES;

    try {
        const { bitmap, width, height } = analyzed;
        const resized = drawToCanvas(bitmap, width, height);
        const imageData = canvasToImageData(resized, width, height);

        const avifBuffer = await encode(imageData, {
            quality,
            speed: AVIF_SPEED,
        });
        const avif = new Uint8Array(avifBuffer);
        if (avif.byteLength > maxBytes) {
            throw new ImageProcessingError(
                `Encoded AVIF is ${Math.round(avif.byteLength / 1024)} KB (limit: ${
                    maxBytes / 1024
                } KB). Try a smaller source image.`,
                "too-large",
            );
        }
        return avif;
    } finally {
        analyzed.bitmap.close?.();
    }
}

export async function processImage(
    file: File,
    options?: ProcessImageOptions,
): Promise<ProcessedImage> {
    const analyzed = await analyzeImage(file, options);
    const avif = await encodeAnalyzedImage(analyzed, options);
    return {
        avif,
        blurhash: analyzed.blurhash,
        width: analyzed.width,
        height: analyzed.height,
        originalName: analyzed.originalName,
        originalType: analyzed.originalType,
    };
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
    try {
        return await createImageBitmap(file);
    } catch (e) {
        throw new ImageProcessingError(
            `Cannot decode image: ${e instanceof Error ? e.message : String(e)}`,
            "decode-failed",
        );
    }
}

function fitDimensions(
    sourceW: number,
    sourceH: number,
    maxEdge: number,
): { width: number; height: number } {
    const longEdge = Math.max(sourceW, sourceH);
    if (longEdge <= maxEdge) return { width: sourceW, height: sourceH };
    const scale = maxEdge / longEdge;
    return {
        width: Math.round(sourceW * scale),
        height: Math.round(sourceH * scale),
    };
}

function drawToCanvas(
    source: ImageBitmap,
    width: number,
    height: number,
): HTMLCanvasElement | OffscreenCanvas {
    if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new ImageProcessingError(
                "Cannot acquire 2D context",
                "decode-failed",
            );
        }
        ctx.drawImage(source, 0, 0, width, height);
        return canvas;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new ImageProcessingError(
            "Cannot acquire 2D context",
            "decode-failed",
        );
    }
    ctx.drawImage(source, 0, 0, width, height);
    return canvas;
}

function canvasToImageData(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    width: number,
    height: number,
): ImageData {
    const ctx = canvas.getContext("2d") as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D
        | null;
    if (!ctx) {
        throw new ImageProcessingError(
            "Cannot acquire 2D context",
            "decode-failed",
        );
    }
    return ctx.getImageData(0, 0, width, height);
}

async function makeBlurhash(source: ImageBitmap): Promise<string> {
    try {
        const { width, height } = fitDimensions(
            source.width,
            source.height,
            BLURHASH_MAX_DIMENSION,
        );
        const canvas = drawToCanvas(source, width, height);
        const imageData = canvasToImageData(canvas, width, height);
        return encodeBlurhash(
            imageData.data,
            width,
            height,
            BLURHASH_X_COMPONENTS,
            BLURHASH_Y_COMPONENTS,
        );
    } catch (e) {
        throw new ImageProcessingError(
            `Blurhash encode failed: ${
                e instanceof Error ? e.message : String(e)
            }`,
            "blurhash-failed",
        );
    }
}
