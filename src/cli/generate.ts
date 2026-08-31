import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import matter from "gray-matter";
import { parseThumbnail, toIsoDate } from "../api/content.js";
import { toUrlSlug } from "../api/slug.js";
import type {
    ArticleInfo,
    ArticleSummary,
    EditorSummary,
    WikiHistoryEntry,
} from "../api/types.js";

const execFileAsync = promisify(execFile);

/** Committer name convention: `"<display name> (<player uuid>)"`. */
const COMMITTER_PLAYER_REGEX = /\(([0-9a-f-]{36})\)\s*$/i;

async function ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
}

async function writeJson(filePath: string, value: unknown) {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Frontmatter `modified` — the edit history imported from the pre-git system.
 * Git commits are the primary history; these entries only cover what happened
 * before the migration.
 */
function importedHistory(data: Record<string, unknown>): WikiHistoryEntry[] {
    const modified = data.modified;
    if (!Array.isArray(modified)) return [];
    const entries: WikiHistoryEntry[] = [];
    for (const raw of modified) {
        if (typeof raw !== "object" || raw === null) continue;
        const entry = raw as { date?: unknown; player?: unknown };
        const date = toIsoDate(entry.date);
        if (!date) continue;
        entries.push({
            date,
            player: typeof entry.player === "string" ? entry.player : null,
            source: "imported",
        });
    }
    return entries;
}

/**
 * Commits that touched the article directory, oldest first. The player uuid
 * is recovered from the committer-name convention `"name (<uuid>)"`
 * (`makeCommitter`'s default format). Requires a full clone — in Actions,
 * check out with `fetch-depth: 0`.
 */
async function gitHistory(
    contentDir: string,
    articleDirName: string,
): Promise<WikiHistoryEntry[]> {
    try {
        const { stdout } = await execFileAsync(
            "git",
            [
                "log",
                "--format=%H%x09%aI%x09%an",
                "--",
                path.join("article", articleDirName),
            ],
            { cwd: contentDir },
        );
        return stdout
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => {
                const [commit, rawDate, name] = line.split("\t");
                return {
                    date: toIsoDate(rawDate) ?? "",
                    player:
                        COMMITTER_PLAYER_REGEX.exec(name ?? "")?.[1] ?? null,
                    source: "git" as const,
                    commit,
                };
            })
            .filter((e) => e.date)
            .reverse();
    } catch {
        // Not a git checkout (or git unavailable) — imported history only.
        return [];
    }
}

/**
 * 履歴を編集者ごとに畳む。最終編集が新しい順。
 *
 * `player` が null のエントリ (移行前の履歴でプレイヤーを解決できなかったもの、
 * コミッター名が `"<name> (<uuid>)"` 規約でないコミット) は誰の編集か辿れないため
 * 除外する。
 */
function summarizeEditors(history: WikiHistoryEntry[]): EditorSummary[] {
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

/**
 * Scan `<contentDir>/article/<uuid>/index.mdx` and emit:
 *   - `article/<uuid>/info.json` — per-article metadata with the merged
 *     history (frontmatter `modified` + git commits) baked in
 *   - `article.json`  — manifest of every article (info minus `history`, plus
 *     `editors` folded out of it)
 *   - `slug-index.json` — slug → uuid map, so `getPostBySlug` can resolve a
 *     slug without scanning the manifest
 *
 * Draft posts (`draft: true`) still get an `info.json` — so publishing later
 * only changes the manifests — but stay out of `article.json` and
 * `slug-index.json`; the content worker blocks their `article/<uuid>/` files.
 */
async function generateArticleLists(contentDir: string) {
    const articleDir = path.join(contentDir, "article");
    await ensureDir(articleDir);
    const entries = await fs.readdir(articleDir, { withFileTypes: true });
    const manifest: ArticleSummary[] = [];
    const slugIndex: Record<string, string> = {};
    let drafts = 0;
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const indexPath = path.join(articleDir, entry.name, "index.mdx");
        let raw: string;
        try {
            raw = await fs.readFile(indexPath, "utf-8");
        } catch {
            console.warn(`skip ${entry.name}: missing index.mdx`);
            continue;
        }
        const { data } = matter(raw);
        if (!data.uuid) {
            console.warn(`uuid missing in ${entry.name}/index.mdx`);
        }
        if (!data.slug) {
            console.warn(`slug missing in ${entry.name}/index.mdx`);
        }

        const history = [
            ...importedHistory(data),
            ...(await gitHistory(contentDir, entry.name)),
        ].sort((a, b) => a.date.localeCompare(b.date));

        const info: ArticleInfo = {
            title: data.title ?? "",
            slug: toUrlSlug(data.slug ?? entry.name),
            uuid: data.uuid ?? entry.name,
            category: data.category ?? "",
            description: data.description ?? "",
            thumbnail: parseThumbnail(data.thumbnail),
            created: history[0]?.date ?? null,
            updated: history[history.length - 1]?.date ?? null,
            history,
        };

        await writeJson(path.join(articleDir, entry.name, "info.json"), info);

        if (data.draft === true) {
            drafts += 1;
            continue;
        }
        const existing = slugIndex[info.slug];
        if (existing) {
            throw new Error(
                `duplicate slug "${info.slug}": ${existing} and ${info.uuid}`,
            );
        }
        const { history: _history, ...summary } = info;
        manifest.push({ ...summary, editors: summarizeEditors(history) });
        slugIndex[info.slug] = info.uuid;
    }
    await writeJson(path.join(contentDir, "article.json"), manifest);
    await writeJson(path.join(contentDir, "slug-index.json"), slugIndex);
    console.info(
        `article.json: ${manifest.length} posts${drafts > 0 ? ` (${drafts} drafts excluded)` : ""}`,
    );
}

async function generateCategoriesList(contentDir: string) {
    const categoriesDir = path.join(contentDir, "categories");
    await ensureDir(categoriesDir);
    const files = await fs.readdir(categoriesDir);
    const categories: Array<Record<string, unknown>> = [];
    for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const raw = await fs.readFile(path.join(categoriesDir, file), "utf-8");
        categories.push(JSON.parse(raw));
    }
    await writeJson(path.join(contentDir, "categories.json"), categories);
    console.info(`categories.json: ${categories.length} categories`);
}

/** Generate every manifest for a hagaki content directory. */
export async function generateManifests(contentDir: string) {
    await generateArticleLists(contentDir);
    await generateCategoriesList(contentDir);
}
