import {
    type ImgDirectiveMeta,
    imgDirective,
    isPendingImageId,
    replaceImgDirectives,
} from "hagaki/markdown";
import {
    addPending,
    getPending,
    idFromPendingUrl,
    pendingUrlFor,
} from "hagaki/pending-images";
import { bytesToBase64 } from "./base64";
import { articleAssetsRepoDir } from "./image-paths";
import type { UploadedImage } from "./post-editor-markdown";

/**
 * Editor upload handler: kicks off AVIF encode + blurhash in the background
 * and returns a session-local `pending:<id>` image id. The editor stores it
 * in the inserted `::img` directive; {@link buildPostPayload} rewrites it to
 * the final `<id>.avif` file name (with blurhash/w/h attributes) at save
 * time.
 */
export async function handleImageUpload(file: File): Promise<string> {
    const processing = import("hagaki/image").then(({ processImage }) =>
        processImage(file),
    );
    processing.catch(() => {});
    const entry = addPending({ file, processing });
    return pendingUrlFor(entry.id);
}

function collectPendingIds(markdown: string): string[] {
    const ids = new Set<string>();
    replaceImgDirectives(markdown, (meta) => {
        if (isPendingImageId(meta.id)) ids.add(meta.id);
        return null;
    });
    return [...ids];
}

export async function buildPostPayload(
    markdown: string,
    uuid: string,
): Promise<{
    body: string;
    images: UploadedImage[];
}> {
    const resolved = new Map<string, ResolvedImage>();
    for (const placeholder of collectPendingIds(markdown)) {
        resolved.set(placeholder, await resolvePendingImage(placeholder, uuid));
    }

    const body = replaceImgDirectives(markdown, (meta) => {
        const image = resolved.get(meta.id);
        // 解決済みメタ(最終ファイル名 + blurhash/w/h)で directive を再構築。
        // alt はユーザー入力なので元の値を引き継ぐ。
        return image ? imgDirective({ ...image.meta, alt: meta.alt }) : null;
    });

    // A leftover `pending:` id after resolution means an upload didn't make
    // it into the commit — refuse to save rather than persist junk.
    if (collectPendingIds(body).length > 0) {
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
    meta: ImgDirectiveMeta;
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

    return {
        meta: {
            id: filename,
            blurhash: processed.blurhash,
            width: processed.width,
            height: processed.height,
        },
        upload: {
            path: `${articleAssetsRepoDir(uuid)}${filename}`,
            avifBase64: bytesToBase64(processed.avif),
        },
    };
}
