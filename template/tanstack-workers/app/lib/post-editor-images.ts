import { resolveCdnUrl } from "@morinoparty/hagaki";
import type { ImageComponentAttrs } from "@morinoparty/hagaki/markdown";
import {
    collectPendingImages,
    findUncommittedImageIds,
    PendingImageError,
    startPending,
} from "@morinoparty/hagaki/pending-images";
import { bytesToBase64 } from "./base64";
import { imagePathsFor } from "./image-paths";

/**
 * 編集中の画像はアップロードしない。AVIF にエンコードした Blob をタブの
 * メモリ (`hagaki/pending-images`) に置き、プレビューは object URL で出す。
 * 保存時に本文と一緒にサーバへ送り、同じコミットに載せる。
 */

/** コミット済み画像の表示 URL（CDN）。 */
export function committedImageUrl(
    id: string,
    postUuid: string,
    cdnBaseUrl: string,
): string {
    return resolveCdnUrl(
        `${imagePathsFor(postUuid).urlPrefix}${id}.avif`,
        cdnBaseUrl,
    );
}

/**
 * エディタの `onInsertImage`。`startPending` は blurhash が出た時点で
 * resolve するので、エンコードを待たずに `<Image />` を挿入できる。
 */
export async function handleInsertImage(
    file: File,
): Promise<ImageComponentAttrs> {
    const entry = await startPending({ file });
    return {
        id: entry.id,
        blurhash: entry.blurhash,
        width: entry.width,
        height: entry.height,
        alt: "",
    };
}

/**
 * 旧形式 `![alt](/article/...)` 画像の表示 URL 解決（CDN のみ）。
 * `<Image />` は `imagePreviewUrlFor` 側で解決される。
 */
export async function handleImagePreview(
    src: string,
    cdnBaseUrl: string,
): Promise<string> {
    return resolveCdnUrl(src, cdnBaseUrl);
}

/** server function に JSON で渡す画像。AVIF バイト列を base64 にしたもの。 */
export interface EncodedImage {
    imageId: string;
    base64: string;
}

/**
 * 保存ペイロードの画像部分。本文が参照していて、まだコミットされていない
 * 画像のエンコード完了を待ち、base64 にして返す。
 */
export async function collectNewImages(
    body: string,
    committedBody: string,
): Promise<EncodedImage[]> {
    let images: Awaited<ReturnType<typeof collectPendingImages>>;
    try {
        images = await collectPendingImages(
            findUncommittedImageIds(body, committedBody),
        );
    } catch (e) {
        if (e instanceof PendingImageError) {
            throw new Error(
                e.failedIds.length > 0
                    ? "画像の変換に失敗しています。失敗した画像を削除するか挿入し直してから保存してください"
                    : "ページを再読み込みしたため、保存前の画像が失われました。画像を挿入し直してから保存してください",
            );
        }
        throw e;
    }
    return Promise.all(
        images.map(async ({ imageId, blob }) => ({
            imageId,
            base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
        })),
    );
}
