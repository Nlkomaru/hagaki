/**
 * Encode/decode blurhash + dimensions inside the markdown image title attribute:
 *   ![alt](url "blurhash=L6PZf...&w=1920&h=1080")
 */

export interface ImageMeta {
    blurhash?: string;
    width?: number;
    height?: number;
}

export function encodeImageTitle(meta: ImageMeta): string {
    const params = new URLSearchParams();
    if (meta.blurhash) params.set("blurhash", meta.blurhash);
    if (meta.width != null) params.set("w", String(meta.width));
    if (meta.height != null) params.set("h", String(meta.height));
    return params.toString();
}

/** Largest dimension we'll trust from an (untrusted-ish) title string. */
const MAX_IMAGE_DIMENSION = 20000;

/**
 * Parse a `w`/`h` query value into a sane positive integer, or `undefined`.
 * Rejects `NaN`, `Infinity`, zero, negatives and absurdly large values so a
 * malformed title can't drive a huge buffer allocation downstream (e.g. the
 * server-side blurhash decode).
 */
function parseDimension(value: string | null): number | undefined {
    if (!value) return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const i = Math.floor(n);
    if (i < 1 || i > MAX_IMAGE_DIMENSION) return undefined;
    return i;
}

export function decodeImageTitle(title: string | undefined): ImageMeta {
    if (!title) return {};
    const params = new URLSearchParams(title);
    return {
        blurhash: params.get("blurhash") ?? undefined,
        width: parseDimension(params.get("w")),
        height: parseDimension(params.get("h")),
    };
}
