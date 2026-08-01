/**
 * Browser-only image processing pipeline:
 *   File → bitmap → resize → AVIF encode (WASM via @jsquash/avif)
 *                          → blurhash (4x4 components)
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

export async function processImage(
    file: File,
    options?: ProcessImageOptions,
): Promise<ProcessedImage> {
    const maxDimension = options?.maxDimension ?? MAX_IMAGE_DIMENSION;
    const quality = options?.quality ?? AVIF_QUALITY;
    const maxBytes = options?.maxBytes ?? MAX_AVIF_BYTES;

    const bitmap = await loadBitmap(file);
    const { width, height } = fitDimensions(
        bitmap.width,
        bitmap.height,
        maxDimension,
    );

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

    const blurhash = await makeBlurhash(bitmap);

    bitmap.close?.();

    return {
        avif,
        blurhash,
        width,
        height,
        originalName: file.name,
        originalType: file.type,
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
