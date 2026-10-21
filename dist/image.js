import { a as processImage, i as encodeAnalyzedImage, n as MAX_AVIF_BYTES, r as analyzeImage, t as ImageProcessingError } from "./pipeline-G2BMjcPR.js";
//#region src/image/validation.ts
/**
* Lightweight AVIF format / size validation. Pure JS — safe to call from any
* runtime (browser, Cloudflare Workers, Node).
*/
const ascii = new TextDecoder("ascii");
const AVIF_BRANDS = /* @__PURE__ */ new Set(["avif", "avis"]);
const MIN_FTYP_BOX_BYTES = 12;
const COMPATIBLE_BRANDS_OFFSET = 16;
const DEFAULT_MAX_BYTES = 512e3;
function readFourCC(bytes, offset) {
	return ascii.decode(bytes.subarray(offset, offset + 4));
}
/**
* Confirm the bytes start with an ISO base media file `ftyp` box whose major
* brand or compatible brand is "avif" (or "avis").
*/
function isAvif(bytes) {
	if (bytes.byteLength < MIN_FTYP_BOX_BYTES) return false;
	const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
	if (boxSize < MIN_FTYP_BOX_BYTES || boxSize > bytes.byteLength) return false;
	if (readFourCC(bytes, 4) !== "ftyp") return false;
	const majorBrand = readFourCC(bytes, 8);
	if (AVIF_BRANDS.has(majorBrand)) return true;
	for (let offset = COMPATIBLE_BRANDS_OFFSET; offset + 4 <= boxSize; offset += 4) if (AVIF_BRANDS.has(readFourCC(bytes, offset))) return true;
	return false;
}
var ImageValidationError = class extends Error {
	code;
	constructor(message, code) {
		super(message);
		this.code = code;
		this.name = "ImageValidationError";
	}
};
function validateAvifUpload(bytes, options) {
	const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
	if (bytes.byteLength > maxBytes) throw new ImageValidationError(`Image too large: ${bytes.byteLength} bytes (max ${maxBytes})`, "size");
	if (!isAvif(bytes)) throw new ImageValidationError("Only AVIF images are accepted", "format");
}
//#endregion
export { ImageProcessingError, ImageValidationError, MAX_AVIF_BYTES, analyzeImage, encodeAnalyzedImage, isAvif, processImage, validateAvifUpload };

//# sourceMappingURL=image.js.map