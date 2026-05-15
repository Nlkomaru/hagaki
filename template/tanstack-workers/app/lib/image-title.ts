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

export function decodeImageTitle(title: string | undefined): ImageMeta {
    if (!title) return {};
    const params = new URLSearchParams(title);
    const w = params.get("w");
    const h = params.get("h");
    return {
        blurhash: params.get("blurhash") ?? undefined,
        width: w ? Number(w) : undefined,
        height: h ? Number(h) : undefined,
    };
}
