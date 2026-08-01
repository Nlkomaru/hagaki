import { resolveCdnUrl } from "hagaki";
import { encodeImageTitle } from "hagaki/image";
import {
    addPending,
    getPending,
    idFromPendingUrl,
    pendingUrlFor,
} from "hagaki/pending-images";
import { bytesToBase64 } from "./base64";
import { imagePathsFor } from "./image-paths";
import type { UploadedImage } from "./post-editor-markdown";

// `pending\\?:` — the markdown serializer may escape the scheme colon, so
// the committed body can read `pending\:<id>`. Match both forms or the save
// path skips the upload and commits a dead `pending:` reference.
const PENDING_IMG_SRC =
    /!\[([^\]]*)\]\((pending\\?:[a-f0-9-]+)(?:\s+"[^"]*")?\)/;
const PENDING_IMG_REGEX = new RegExp(PENDING_IMG_SRC, "g");

// A leftover *image* `pending:` reference after resolution means an upload
// didn't make it into the commit — refuse to save rather than persist junk.
// Matching the image syntax (not a bare `pending:` substring) avoids false
// positives on literal `pending:<id>` text inside code blocks/prose.
function hasUnresolvedPendingImage(body: string): boolean {
    return new RegExp(PENDING_IMG_SRC).test(body);
}

export async function handleImageUpload(file: File): Promise<string> {
    const processing = import("hagaki/image").then(({ processImage }) =>
        processImage(file),
    );
    processing.catch(() => {});
    const entry = addPending({ file, processing });
    return pendingUrlFor(entry.id);
}

export async function handleImagePreview(
    src: string,
    cdnBaseUrl: string,
): Promise<string> {
    const id = idFromPendingUrl(src);
    if (id) {
        const entry = getPending(id);
        if (entry) return entry.previewBlobUrl;
    }
    return resolveCdnUrl(src, cdnBaseUrl);
}

export async function buildPostPayload(
    markdown: string,
    uuid: string,
): Promise<{
    body: string;
    images: UploadedImage[];
}> {
    const resolved = new Map<string, ResolvedImage>();
    for (const match of markdown.matchAll(PENDING_IMG_REGEX)) {
        const placeholder = match[2];
        if (!placeholder || resolved.has(placeholder)) continue;
        resolved.set(placeholder, await resolvePendingImage(placeholder, uuid));
    }

    const body = markdown.replace(
        PENDING_IMG_REGEX,
        (full: string, alt: string, placeholder: string) => {
            const image = resolved.get(placeholder);
            return image ? `![${alt}](${image.replacement})` : full;
        },
    );

    // Re-check the result with the same image syntax: anything still
    // unresolved means the upload never landed — block the save.
    if (hasUnresolvedPendingImage(body)) {
        throw new Error(
            "An image is still uploading or failed to process. Wait for the upload to finish, or remove the image, then save again.",
        );
    }

    return {
        body,
        images: Array.from(resolved.values(), (image) => image.upload),
    };
}

interface ResolvedImage {
    replacement: string;
    upload: UploadedImage;
}

async function resolvePendingImage(
    placeholder: string,
    uuid: string,
): Promise<ResolvedImage> {
    const id = idFromPendingUrl(placeholder);
    const entry = id ? getPending(id) : undefined;
    if (!entry) {
        throw new Error(
            `Image upload state lost for ${placeholder}. Please re-insert the image.`,
        );
    }

    const processed = await entry.processing;
    const filename = `${entry.id}.avif`;
    const title = encodeImageTitle({
        blurhash: processed.blurhash,
        width: processed.width,
        height: processed.height,
    });
    const paths = imagePathsFor(uuid);

    return {
        replacement: `${paths.urlPrefix}${filename} "${title}"`,
        upload: {
            path: `${paths.repoDir}${filename}`,
            avifBase64: bytesToBase64(processed.avif),
        },
    };
}
