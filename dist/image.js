export { ImageProcessingError, MAX_AVIF_BYTES, analyzeImage, encodeAnalyzedImage, processImage } from './chunk-LSPG3ZGH.js';

// src/image/validation.ts
var ascii = new TextDecoder("ascii");
var AVIF_BRANDS = /* @__PURE__ */ new Set(["avif", "avis"]);
var MIN_FTYP_BOX_BYTES = 12;
var COMPATIBLE_BRANDS_OFFSET = 16;
var DEFAULT_MAX_BYTES = 500 * 1024;
function readFourCC(bytes, offset) {
  return ascii.decode(bytes.subarray(offset, offset + 4));
}
function isAvif(bytes) {
  if (bytes.byteLength < MIN_FTYP_BOX_BYTES) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxSize = view.getUint32(0);
  if (boxSize < MIN_FTYP_BOX_BYTES || boxSize > bytes.byteLength) {
    return false;
  }
  if (readFourCC(bytes, 4) !== "ftyp") return false;
  const majorBrand = readFourCC(bytes, 8);
  if (AVIF_BRANDS.has(majorBrand)) return true;
  for (let offset = COMPATIBLE_BRANDS_OFFSET; offset + 4 <= boxSize; offset += 4) {
    if (AVIF_BRANDS.has(readFourCC(bytes, offset))) return true;
  }
  return false;
}
var ImageValidationError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "ImageValidationError";
  }
  code;
};
function validateAvifUpload(bytes, options) {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  if (bytes.byteLength > maxBytes) {
    throw new ImageValidationError(
      `Image too large: ${bytes.byteLength} bytes (max ${maxBytes})`,
      "size"
    );
  }
  if (!isAvif(bytes)) {
    throw new ImageValidationError(
      "Only AVIF images are accepted",
      "format"
    );
  }
}

export { ImageValidationError, isAvif, validateAvifUpload };
//# sourceMappingURL=image.js.map
//# sourceMappingURL=image.js.map