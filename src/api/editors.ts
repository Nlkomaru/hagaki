import type { EditorSummary, WikiHistoryEntry } from "./types.js";

/**
 * 履歴を編集者ごとに畳む。最終編集が新しい順。
 *
 * `player` が null のエントリ (移行前の履歴でプレイヤーを解決できなかったもの、
 * コミッター名が `"<name> (<uuid>)"` 規約でないコミット) は誰の編集か辿れないため
 * 除外する。
 */
export function summarizeEditors(history: WikiHistoryEntry[]): EditorSummary[] {
    const byPlayer = new Map<string, EditorSummary>();
    for (const entry of history) {
        if (!entry.player) continue;
        const current = byPlayer.get(entry.player);
        if (current) {
            current.edits += 1;
            if (entry.date > current.lastEditedAt) {
                current.lastEditedAt = entry.date;
            }
        } else {
            byPlayer.set(entry.player, {
                player: entry.player,
                edits: 1,
                lastEditedAt: entry.date,
            });
        }
    }
    return [...byPlayer.values()].sort((a, b) =>
        b.lastEditedAt.localeCompare(a.lastEditedAt),
    );
}
