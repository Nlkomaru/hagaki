import type { EditorSummary, WikiHistoryEntry } from "./types.js";

/**
 * 履歴を編集者ごとに畳む。最終編集が新しい順。
 *
 * `userId` が null のエントリ (移行前の履歴で編集者を解決できなかったもの、
 * コミッター名が `"<name> (<id>)"` 規約でないコミット) は誰の編集か辿れないため
 * 除外する。
 */
export function summarizeEditors(history: WikiHistoryEntry[]): EditorSummary[] {
    const byUser = new Map<string, EditorSummary>();
    for (const entry of history) {
        if (!entry.userId) continue;
        const current = byUser.get(entry.userId);
        if (current) {
            current.edits += 1;
            if (entry.date > current.lastEditedAt) {
                current.lastEditedAt = entry.date;
            }
        } else {
            byUser.set(entry.userId, {
                userId: entry.userId,
                edits: 1,
                lastEditedAt: entry.date,
            });
        }
    }
    return [...byUser.values()].sort((a, b) =>
        b.lastEditedAt.localeCompare(a.lastEditedAt),
    );
}
