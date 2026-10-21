import { decode } from "blurhash";
//#region src/markdown/blurhash-data-url.ts
const DECODE_WIDTH = 32;
const BYTES_PER_RGB_PIXEL = 3;
const DIB_HEADER_BYTES = 40;
const BMP_HEADER_BYTES = 54;
const BMP_ROW_ALIGNMENT_BYTES = 4;
const BMP_SIGNATURE_B = 66;
const BMP_SIGNATURE_M = 77;
const BMP_PLANES = 1;
const BMP_BITS_PER_PIXEL = 24;
const BMP_NO_COMPRESSION = 0;
const PIXELS_PER_METER_72_DPI = 2835;
function bytesToBase64(bytes) {
	if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
	let bin = "";
	const chunk = 32768;
	for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
	return btoa(bin);
}
function alignedBmpRowSize(width) {
	const rawRowBytes = BYTES_PER_RGB_PIXEL * width;
	return Math.ceil(rawRowBytes / BMP_ROW_ALIGNMENT_BYTES) * BMP_ROW_ALIGNMENT_BYTES;
}
/**
* Encode an RGBA top-down pixel buffer as a 24-bit BMP. BMP is the cheapest
* universally-supported `<img>` format we can synthesize without a PNG
* encoder or `<canvas>` — important because this runs on Cloudflare Workers
* during loader execution.
*/
function rgbaToBmp(rgba, width, height) {
	const rowSize = alignedBmpRowSize(width);
	const pixelDataSize = rowSize * height;
	const fileSize = BMP_HEADER_BYTES + pixelDataSize;
	const buf = new Uint8Array(fileSize);
	const dv = new DataView(buf.buffer);
	buf[0] = BMP_SIGNATURE_B;
	buf[1] = BMP_SIGNATURE_M;
	dv.setUint32(2, fileSize, true);
	dv.setUint32(10, BMP_HEADER_BYTES, true);
	dv.setUint32(14, DIB_HEADER_BYTES, true);
	dv.setInt32(18, width, true);
	dv.setInt32(22, -height, true);
	dv.setUint16(26, BMP_PLANES, true);
	dv.setUint16(28, BMP_BITS_PER_PIXEL, true);
	dv.setUint32(30, BMP_NO_COMPRESSION, true);
	dv.setUint32(34, pixelDataSize, true);
	dv.setUint32(38, PIXELS_PER_METER_72_DPI, true);
	dv.setUint32(42, PIXELS_PER_METER_72_DPI, true);
	let dst = BMP_HEADER_BYTES;
	for (let y = 0; y < height; y++) {
		const rowStart = dst;
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			buf[dst++] = rgba[i + 2] ?? 0;
			buf[dst++] = rgba[i + 1] ?? 0;
			buf[dst++] = rgba[i] ?? 0;
		}
		while (dst - rowStart < rowSize) buf[dst++] = 0;
	}
	return buf;
}
/**
* Decode a blurhash and serialize it as a `data:image/bmp;base64,...` URL.
* Designed to be called from a server loader so the placeholder can be baked
* into the SSR HTML and rendered without any client-side JS.
*/
const MAX_DECODE_HEIGHT = 1024;
function blurhashToDataUrl(hash, width, height) {
	const cw = DECODE_WIDTH;
	const ch = typeof width === "number" && typeof height === "number" && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? Math.min(MAX_DECODE_HEIGHT, Math.max(1, Math.round(height / width * cw))) : DECODE_WIDTH;
	try {
		return `data:image/bmp;base64,${bytesToBase64(rgbaToBmp(decode(hash, cw, ch), cw, ch))}`;
	} catch {
		return "";
	}
}
//#endregion
export { blurhashToDataUrl as t };

//# sourceMappingURL=blurhash-data-url-CIOkeGeK.js.map