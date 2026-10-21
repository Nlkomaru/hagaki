import { encode } from "blurhash";
import encode$1 from "@jsquash/avif/encode";
//#region src/image/pipeline.ts
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
const MAX_IMAGE_DIMENSION = 1920;
const AVIF_QUALITY = 50;
const AVIF_SPEED = 6;
const BLURHASH_MAX_DIMENSION = 32;
const BLURHASH_X_COMPONENTS = 4;
const BLURHASH_Y_COMPONENTS = 4;
const MAX_AVIF_BYTES = 512e3;
var ImageProcessingError = class extends Error {
	code;
	constructor(message, code) {
		super(message);
		this.code = code;
		this.name = "ImageProcessingError";
	}
};
/**
* Fast first stage: decode the file, pick the output dimensions, and compute
* the blurhash — everything needed to show a placeholder in the editor before
* the (slow) AVIF encode has even started.
*/
async function analyzeImage(file, options) {
	const maxDimension = options?.maxDimension ?? MAX_IMAGE_DIMENSION;
	const bitmap = await loadBitmap(file);
	try {
		const { width, height } = fitDimensions(bitmap.width, bitmap.height, maxDimension);
		return {
			blurhash: await makeBlurhash(bitmap),
			width,
			height,
			bitmap,
			originalName: file.name,
			originalType: file.type
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
async function encodeAnalyzedImage(analyzed, options) {
	const quality = options?.quality ?? AVIF_QUALITY;
	const maxBytes = options?.maxBytes ?? 512e3;
	try {
		const { bitmap, width, height } = analyzed;
		const imageData = canvasToImageData(drawToCanvas(bitmap, width, height), width, height);
		const avifBuffer = await encode$1(imageData, {
			quality,
			speed: AVIF_SPEED
		});
		const avif = new Uint8Array(avifBuffer);
		if (avif.byteLength > maxBytes) throw new ImageProcessingError(`Encoded AVIF is ${Math.round(avif.byteLength / 1024)} KB (limit: ${maxBytes / 1024} KB). Try a smaller source image.`, "too-large");
		return avif;
	} finally {
		analyzed.bitmap.close?.();
	}
}
async function processImage(file, options) {
	const analyzed = await analyzeImage(file, options);
	return {
		avif: await encodeAnalyzedImage(analyzed, options),
		blurhash: analyzed.blurhash,
		width: analyzed.width,
		height: analyzed.height,
		originalName: analyzed.originalName,
		originalType: analyzed.originalType
	};
}
async function loadBitmap(file) {
	try {
		return await createImageBitmap(file);
	} catch (e) {
		throw new ImageProcessingError(`Cannot decode image: ${e instanceof Error ? e.message : String(e)}`, "decode-failed");
	}
}
function fitDimensions(sourceW, sourceH, maxEdge) {
	const longEdge = Math.max(sourceW, sourceH);
	if (longEdge <= maxEdge) return {
		width: sourceW,
		height: sourceH
	};
	const scale = maxEdge / longEdge;
	return {
		width: Math.round(sourceW * scale),
		height: Math.round(sourceH * scale)
	};
}
function drawToCanvas(source, width, height) {
	if (typeof OffscreenCanvas !== "undefined") {
		const canvas = new OffscreenCanvas(width, height);
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new ImageProcessingError("Cannot acquire 2D context", "decode-failed");
		ctx.drawImage(source, 0, 0, width, height);
		return canvas;
	}
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new ImageProcessingError("Cannot acquire 2D context", "decode-failed");
	ctx.drawImage(source, 0, 0, width, height);
	return canvas;
}
function canvasToImageData(canvas, width, height) {
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new ImageProcessingError("Cannot acquire 2D context", "decode-failed");
	return ctx.getImageData(0, 0, width, height);
}
async function makeBlurhash(source) {
	try {
		const { width, height } = fitDimensions(source.width, source.height, BLURHASH_MAX_DIMENSION);
		const imageData = canvasToImageData(drawToCanvas(source, width, height), width, height);
		return encode(imageData.data, width, height, BLURHASH_X_COMPONENTS, BLURHASH_Y_COMPONENTS);
	} catch (e) {
		throw new ImageProcessingError(`Blurhash encode failed: ${e instanceof Error ? e.message : String(e)}`, "blurhash-failed");
	}
}
//#endregion
export { processImage as a, encodeAnalyzedImage as i, MAX_AVIF_BYTES as n, analyzeImage as r, ImageProcessingError as t };

//# sourceMappingURL=pipeline-G2BMjcPR.js.map