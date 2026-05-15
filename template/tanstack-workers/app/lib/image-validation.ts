import { MAX_AVIF_BYTES } from "./image-pipeline";

const ascii = new TextDecoder("ascii");

function readFourCC(bytes: Uint8Array, offset: number): string {
    return ascii.decode(bytes.subarray(offset, offset + 4));
}

/**
 * Confirm the bytes start with an ISO base media file `ftyp` box whose major
 * brand or compatible brand is "avif" (or AVIS). This is the lightweight check
 * we run on the server before committing — the client did the actual encode.
 */
export function isAvif(bytes: Uint8Array): boolean {
    if (bytes.byteLength < 12) return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const boxSize = view.getUint32(0);
    if (boxSize < 12 || boxSize > bytes.byteLength) return false;
    if (readFourCC(bytes, 4) !== "ftyp") return false;

    const majorBrand = readFourCC(bytes, 8);
    if (majorBrand === "avif" || majorBrand === "avis") return true;

    // Compatible brands list starts after major_brand + minor_version (offset 16).
    for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
        const brand = readFourCC(bytes, offset);
        if (brand === "avif" || brand === "avis") return true;
    }
    return false;
}

export interface ImageValidationOptions {
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
    const maxBytes = options?.maxBytes ?? MAX_AVIF_BYTES;
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
