import { isPendingImageId, replaceImgDirectives } from "hagaki/markdown";

export interface UploadedImage {
    /** Repository path, e.g. `content/article/<uuid>/assets/abc.avif`. */
    path: string;
    /** Base64-encoded AVIF bytes. */
    avifBase64: string;
}

// Orphan `pending:` placeholders that leaked into a committed body (an old
// editor bug / an interrupted save). They can never resolve outside the
// session that created them, so drop them on load.
const LEGACY_PENDING_IMG_REGEX =
    /!\[[^\]]*\]\(pending\\?:[a-f0-9-]+(?:\s+"[^"]*")?\)/g;

export function stripStalePendingImages(body: string): string {
    const withoutLegacy = body.replace(LEGACY_PENDING_IMG_REGEX, "");
    return replaceImgDirectives(withoutLegacy, (meta) =>
        isPendingImageId(meta.id) ? "" : null,
    );
}
