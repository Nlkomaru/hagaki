import { resolveCdnUrl } from "hagaki";
import {
    extractImageComponentIds,
    type ImageComponentAttrs,
} from "hagaki/markdown";
import {
    getPending,
    listPending,
    removePending,
    startPending,
} from "hagaki/pending-images";
import { imagePathsFor } from "./image-paths";

// `pending\\?:` — the markdown serializer may escape the scheme colon, so a
// legacy body can read `pending\:<id>`. These references come from the old
// (pre-directive) upload flow; the session state behind them is long gone, so
// a save that still contains one must be refused rather than committing a
// dead `pending:` link. Matching the image syntax (not a bare `pending:`
// substring) avoids false positives on literal text in code blocks/prose.
const PENDING_IMG_SRC =
    /!\[([^\]]*)\]\((pending\\?:[a-f0-9-]+)(?:\s+"[^"]*")?\)/;

function hasUnresolvedPendingImage(body: string): boolean {
    return new RegExp(PENDING_IMG_SRC).test(body);
}

/** 編集中プレビュー URL（Workers の一時配信、R2 バックエンド）。 */
export function pendingImagePreviewUrl(
    postUuid: string,
    imageId: string,
): string {
    return `/api/pending-images/${postUuid}/${imageId}`;
}

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
 * エディタの `onInsertImage`。`startPending` が blurhash を確定した時点で
 * resolve するので、directive をすぐ挿入できる。AVIF エンコードと Workers
 * への PUT はバックグラウンドで続き、進捗は pending store が通知する。
 */
export async function handleInsertImage(
    file: File,
    postUuid: string,
): Promise<ImageComponentAttrs> {
    const entry = await startPending({
        file,
        upload: async ({ id, avif }) => {
            const url = pendingImagePreviewUrl(postUuid, id);
            const res = await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": "application/octet-stream" },
                body: avif as BodyInit,
            });
            if (!res.ok) {
                throw new Error(
                    `Image upload failed: ${res.status} ${res.statusText}`,
                );
            }
            return url;
        },
    });
    return {
        id: entry.id,
        blurhash: entry.blurhash,
        width: entry.width,
        height: entry.height,
        alt: "",
    };
}

/**
 * 本文から消えた失敗エントリを store から掃除する。`<Image />` ノードを
 * Backspace や undo で消しても removePending は呼ばれないため、放置すると
 * hasErrors() が真のまま保存ボタンが永久に無効化される。エディタの
 * onChange から毎回呼ぶ想定なので、markdown をパースせず uuid の部分文字列
 * 一致で判定する（uuid が偶然本文に現れる誤一致は事実上起きない）。error
 * エントリに限定して消すので、undo で <Image /> が本文へ戻っても進行中・
 * アップロード済みのエントリを誤って破棄しない。
 */
export function sweepOrphanedImageErrors(body: string): void {
    for (const entry of listPending()) {
        if (entry.status === "error" && !body.includes(entry.id)) {
            removePending(entry.id);
        }
    }
}

/**
 * 旧形式 `![alt](/article/...)` 画像の表示 URL 解決（CDN のみ）。新フローの
 * directive 画像はここを通らない — `imagePreviewUrlFor` 側で解決される。
 */
export async function handleImagePreview(
    src: string,
    cdnBaseUrl: string,
): Promise<string> {
    return resolveCdnUrl(src, cdnBaseUrl);
}

/**
 * 保存ペイロードの組み立て。directive 方式では本文の書き換えは不要 —
 * まだコミットされていない画像 id を集めて、アップロードの完了だけ待つ。
 *
 * store に無い id（リロード後など）もそのまま送る: R2 に残っていれば
 * サーバ側で回収でき、無ければサーバがユーザー向けエラーで拒否する。
 */
export async function buildPostPayload(
    markdown: string,
    uuid: string,
    committedBody: string,
): Promise<{ body: string; pendingImageIds: string[] }> {
    // Legacy `pending:` references cannot be resolved anymore — block the
    // save so the user re-inserts the image through the new flow.
    if (hasUnresolvedPendingImage(markdown)) {
        throw new Error(
            "An image from an old editing session cannot be recovered. Remove the broken image and re-insert it, then save again.",
        );
    }

    const committedIds = new Set(extractImageComponentIds(committedBody));
    const pendingImageIds = extractImageComponentIds(markdown).filter(
        (id) => !committedIds.has(id),
    );

    for (const id of pendingImageIds) {
        const entry = getPending(id);
        if (!entry) continue;
        try {
            // Resolves once the background encode + upload for this image
            // finished; rejects if either step failed.
            await entry.done;
        } catch {
            throw new Error(
                "An image failed to upload. Remove the failed image (or re-insert it), then save again.",
            );
        }
    }

    void uuid; // 揃えたシグネチャ — サーバ側が uuid から R2 キーを組み立てる
    return { body: markdown, pendingImageIds };
}
