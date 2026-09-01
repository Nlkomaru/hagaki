import encode from '@jsquash/avif/encode';
import { encode as encode$1 } from 'blurhash';

// src/image/pipeline.ts
var MAX_IMAGE_DIMENSION = 1920;
var AVIF_QUALITY = 50;
var AVIF_SPEED = 6;
var BLURHASH_MAX_DIMENSION = 32;
var BLURHASH_X_COMPONENTS = 4;
var BLURHASH_Y_COMPONENTS = 4;
var MAX_AVIF_BYTES = 500 * 1024;
var ImageProcessingError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "ImageProcessingError";
  }
  code;
};
async function analyzeImage(file, options) {
  const maxDimension = options?.maxDimension ?? MAX_IMAGE_DIMENSION;
  const bitmap = await loadBitmap(file);
  try {
    const { width, height } = fitDimensions(
      bitmap.width,
      bitmap.height,
      maxDimension
    );
    const blurhash = await makeBlurhash(bitmap);
    return {
      blurhash,
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
async function encodeAnalyzedImage(analyzed, options) {
  const quality = options?.quality ?? AVIF_QUALITY;
  const maxBytes = options?.maxBytes ?? MAX_AVIF_BYTES;
  try {
    const { bitmap, width, height } = analyzed;
    const resized = drawToCanvas(bitmap, width, height);
    const imageData = canvasToImageData(resized, width, height);
    const avifBuffer = await encode(imageData, {
      quality,
      speed: AVIF_SPEED
    });
    const avif = new Uint8Array(avifBuffer);
    if (avif.byteLength > maxBytes) {
      throw new ImageProcessingError(
        `Encoded AVIF is ${Math.round(avif.byteLength / 1024)} KB (limit: ${maxBytes / 1024} KB). Try a smaller source image.`,
        "too-large"
      );
    }
    return avif;
  } finally {
    analyzed.bitmap.close?.();
  }
}
async function processImage(file, options) {
  const analyzed = await analyzeImage(file, options);
  const avif = await encodeAnalyzedImage(analyzed, options);
  return {
    avif,
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
    throw new ImageProcessingError(
      `Cannot decode image: ${e instanceof Error ? e.message : String(e)}`,
      "decode-failed"
    );
  }
}
function fitDimensions(sourceW, sourceH, maxEdge) {
  const longEdge = Math.max(sourceW, sourceH);
  if (longEdge <= maxEdge) return { width: sourceW, height: sourceH };
  const scale = maxEdge / longEdge;
  return {
    width: Math.round(sourceW * scale),
    height: Math.round(sourceH * scale)
  };
}
function drawToCanvas(source, width, height) {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas2 = new OffscreenCanvas(width, height);
    const ctx2 = canvas2.getContext("2d");
    if (!ctx2) {
      throw new ImageProcessingError(
        "Cannot acquire 2D context",
        "decode-failed"
      );
    }
    ctx2.drawImage(source, 0, 0, width, height);
    return canvas2;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ImageProcessingError(
      "Cannot acquire 2D context",
      "decode-failed"
    );
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}
function canvasToImageData(canvas, width, height) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new ImageProcessingError(
      "Cannot acquire 2D context",
      "decode-failed"
    );
  }
  return ctx.getImageData(0, 0, width, height);
}
async function makeBlurhash(source) {
  try {
    const { width, height } = fitDimensions(
      source.width,
      source.height,
      BLURHASH_MAX_DIMENSION
    );
    const canvas = drawToCanvas(source, width, height);
    const imageData = canvasToImageData(canvas, width, height);
    return encode$1(
      imageData.data,
      width,
      height,
      BLURHASH_X_COMPONENTS,
      BLURHASH_Y_COMPONENTS
    );
  } catch (e) {
    throw new ImageProcessingError(
      `Blurhash encode failed: ${e instanceof Error ? e.message : String(e)}`,
      "blurhash-failed"
    );
  }
}

export { ImageProcessingError, MAX_AVIF_BYTES, analyzeImage, encodeAnalyzedImage, processImage };
//# sourceMappingURL=chunk-LSPG3ZGH.js.map
//# sourceMappingURL=chunk-LSPG3ZGH.js.map