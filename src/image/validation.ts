/**
 * Lightweight AVIF format / size validation. Pure JS — safe to call from any
 * runtime (browser, Cloudflare Workers, Node).
 */

const ascii = new TextDecoder("ascii");
const AVIF_BRANDS = new Set(["avif", "avis"]);
const MIN_FTYP_BOX_BYTES = 12;
const COMPATIBLE_BRANDS_OFFSET = 16;
const DEFAULT_MAX_BYTES = 500 * 1024;

function readFourCC(bytes: Uint8Array, offset: number): string {
    return ascii.decode(bytes.subarray(offset, offset + 4));
}

/**
 * Confirm the bytes start with an ISO base media file `ftyp` box whose major
 * brand or compatible brand is "avif" (or "avis").
 */
export function isAvif(bytes: Uint8Array): boolean {
    if (bytes.byteLength < MIN_FTYP_BOX_BYTES) return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const boxSize = view.getUint32(0);
    if (boxSize < MIN_FTYP_BOX_BYTES || boxSize > bytes.byteLength) {
        return false;
    }
    if (readFourCC(bytes, 4) !== "ftyp") return false;

    const majorBrand = readFourCC(bytes, 8);
    if (AVIF_BRANDS.has(majorBrand)) return true;

    // Compatible brands list starts after major_brand + minor_version (offset 16).
    for (
        let offset = COMPATIBLE_BRANDS_OFFSET;
        offset + 4 <= boxSize;
        offset += 4
    ) {
        if (AVIF_BRANDS.has(readFourCC(bytes, offset))) return true;
    }
    return false;
}

export interface ImageValidationOptions {
    /** Maximum allowed byte length. Defaults to 500 KB. */
    maxBytes?: number;
}

export class ImageValidationError extends Error {
    constructor(
        message: string,
        readonly code: "size" | "format",
    ) {
        super(message);
        this.name = "ImageValidationError";
    }
}

export function validateAvifUpload(
    bytes: Uint8Array,
    options?: ImageValidationOptions,
): void {
    const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
    if (bytes.byteLength > maxBytes) {
        throw new ImageValidationError(
            `Image too large: ${bytes.byteLength} bytes (max ${maxBytes})`,
            "size",
        );
    }
    if (!isAvif(bytes)) {
        throw new ImageValidationError(
            "Only AVIF images are accepted",
            "format",
        );
    }
}
