import { decode as decodeBlurhash } from "blurhash";

const DECODE_W = 32;

function bytesToBase64(bytes: Uint8Array): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(
            ...(bytes.subarray(i, i + chunk) as unknown as number[]),
        );
    }
    return btoa(bin);
}

/**
 * Encode an RGBA top-down pixel buffer as a 24-bit BMP. BMP is the cheapest
 * universally-supported `<img>` format we can synthesize without a PNG
 * encoder or `<canvas>` — important because this runs on Cloudflare Workers
 * during loader execution.
 */
function rgbaToBmp(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
): Uint8Array {
    const rowSize = (3 * width + 3) & ~3;
    const pixelDataSize = rowSize * height;
    const fileSize = 54 + pixelDataSize;
    const buf = new Uint8Array(fileSize);
    const dv = new DataView(buf.buffer);

    buf[0] = 0x42;
    buf[1] = 0x4d;
    dv.setUint32(2, fileSize, true);
    dv.setUint32(10, 54, true);

    dv.setUint32(14, 40, true);
    dv.setInt32(18, width, true);
    // Negative height = top-down bitmap, matches the blurhash pixel order so
    // we don't have to flip rows.
    dv.setInt32(22, -height, true);
    dv.setUint16(26, 1, true);
    dv.setUint16(28, 24, true);
    dv.setUint32(30, 0, true);
    dv.setUint32(34, pixelDataSize, true);
    dv.setUint32(38, 2835, true);
    dv.setUint32(42, 2835, true);

    let dst = 54;
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
 * Designed to be called from a TanStack loader so the placeholder can be
 * baked into the SSR HTML and rendered without any client-side JS.
 */
export function blurhashToDataUrl(
    hash: string,
    width?: number,
    height?: number,
): string {
    const cw = DECODE_W;
    const ch =
        width && height
            ? Math.max(1, Math.round((height / width) * cw))
            : DECODE_W;
    try {
        const pixels = decodeBlurhash(hash, cw, ch);
        const bmp = rgbaToBmp(pixels, cw, ch);
        return `data:image/bmp;base64,${bytesToBase64(bmp)}`;
    } catch {
        return "";
    }
}
