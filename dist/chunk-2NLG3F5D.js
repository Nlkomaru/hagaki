import { decode } from 'blurhash';

// src/markdown/blurhash-data-url.ts
var DECODE_WIDTH = 32;
var BYTES_PER_RGB_PIXEL = 3;
var BMP_FILE_HEADER_BYTES = 14;
var DIB_HEADER_BYTES = 40;
var BMP_HEADER_BYTES = BMP_FILE_HEADER_BYTES + DIB_HEADER_BYTES;
var BMP_ROW_ALIGNMENT_BYTES = 4;
var BMP_SIGNATURE_B = 66;
var BMP_SIGNATURE_M = 77;
var BMP_PLANES = 1;
var BMP_BITS_PER_PIXEL = 24;
var BMP_NO_COMPRESSION = 0;
var PIXELS_PER_METER_72_DPI = 2835;
function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(
      ...bytes.subarray(i, i + chunk)
    );
  }
  return btoa(bin);
}
function alignedBmpRowSize(width) {
  const rawRowBytes = BYTES_PER_RGB_PIXEL * width;
  return Math.ceil(rawRowBytes / BMP_ROW_ALIGNMENT_BYTES) * BMP_ROW_ALIGNMENT_BYTES;
}
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
var MAX_DECODE_HEIGHT = 1024;
function blurhashToDataUrl(hash, width, height) {
  const cw = DECODE_WIDTH;
  const ratioValid = typeof width === "number" && typeof height === "number" && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
  const ch = ratioValid ? Math.min(
    MAX_DECODE_HEIGHT,
    Math.max(1, Math.round(height / width * cw))
  ) : DECODE_WIDTH;
  try {
    const pixels = decode(hash, cw, ch);
    const bmp = rgbaToBmp(pixels, cw, ch);
    return `data:image/bmp;base64,${bytesToBase64(bmp)}`;
  } catch {
    return "";
  }
}

// src/markdown/blurhash64.ts
function blurhashToBase64(raw) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(raw, "utf-8").toString("base64");
  }
  return btoa(raw);
}
function blurhashFromBase64(encoded) {
  if (!encoded) return void 0;
  try {
    if (typeof Buffer !== "undefined") {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      return decoded || void 0;
    }
    return atob(encoded) || void 0;
  } catch {
    return void 0;
  }
}

export { blurhashFromBase64, blurhashToBase64, blurhashToDataUrl };
//# sourceMappingURL=chunk-2NLG3F5D.js.map
//# sourceMappingURL=chunk-2NLG3F5D.js.map