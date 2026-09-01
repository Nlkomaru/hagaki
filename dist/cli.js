#!/usr/bin/env node

// src/cli/index.ts
import * as path2 from "path";
import { parseArgs } from "util";

// src/cli/generate.ts
import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as path from "path";
import { promisify } from "util";
import matter2 from "gray-matter";

// src/api/content.ts
import matter from "gray-matter";
function parseThumbnail(value) {
  if (typeof value !== "object" || value === null) return null;
  const { imageId, blurhash64 } = value;
  if (typeof imageId !== "string" || !imageId) return null;
  return {
    imageId,
    blurhash64: typeof blurhash64 === "string" ? blurhash64 : ""
  };
}
function toIsoDate(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return null;
}

// src/api/slug.ts
function toUrlSlug(str) {
  return encodeURIComponent(
    str.normalize("NFKC").replace(
      /[Ａ-Ｚａ-ｚ０-９]/g,
      (s) => String.fromCharCode(s.charCodeAt(0) - 65248)
    ).replace(/\s+/g, "-").replace(/[\u3000]/g, "-").replace(/--+/g, "-").replace(/^-+|-+$/g, "").toLowerCase()
  );
}

// src/cli/generate.ts
var execFileAsync = promisify(execFile);
var COMMITTER_PLAYER_REGEX = /\(([0-9a-f-]{36})\)\s*$/i;
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}
async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}
`);
}
function importedHistory(data) {
  const modified = data.modified;
  if (!Array.isArray(modified)) return [];
  const entries = [];
  for (const raw of modified) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw;
    const date = toIsoDate(entry.date);
    if (!date) continue;
    entries.push({
      date,
      player: typeof entry.player === "string" ? entry.player : null,
      source: "imported"
    });
  }
  return entries;
}
async function gitHistory(contentDir, articleDirName) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      [
        "log",
        "--format=%H%x09%aI%x09%an",
        "--",
        path.join("article", articleDirName)
      ],
      { cwd: contentDir }
    );
    return stdout.trim().split("\n").filter(Boolean).map((line) => {
      const [commit, rawDate, name] = line.split("	");
      return {
        date: toIsoDate(rawDate) ?? "",
        player: COMMITTER_PLAYER_REGEX.exec(name ?? "")?.[1] ?? null,
        source: "git",
        commit
      };
    }).filter((e) => e.date).reverse();
  } catch {
    return [];
  }
}
function summarizeEditors(history) {
  const byPlayer = /* @__PURE__ */ new Map();
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
        lastEditedAt: entry.date
      });
    }
  }
  return [...byPlayer.values()].sort(
    (a, b) => b.lastEditedAt.localeCompare(a.lastEditedAt)
  );
}
async function generateArticleLists(contentDir) {
  const articleDir = path.join(contentDir, "article");
  await ensureDir(articleDir);
  const entries = await fs.readdir(articleDir, { withFileTypes: true });
  const manifest = [];
  const slugIndex = {};
  let drafts = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(articleDir, entry.name, "index.mdx");
    let raw;
    try {
      raw = await fs.readFile(indexPath, "utf-8");
    } catch {
      console.warn(`skip ${entry.name}: missing index.mdx`);
      continue;
    }
    const { data } = matter2(raw);
    if (!data.uuid) {
      console.warn(`uuid missing in ${entry.name}/index.mdx`);
    }
    if (!data.slug) {
      console.warn(`slug missing in ${entry.name}/index.mdx`);
    }
    const history = [
      ...importedHistory(data),
      ...await gitHistory(contentDir, entry.name)
    ].sort((a, b) => a.date.localeCompare(b.date));
    const info = {
      title: data.title ?? "",
      slug: toUrlSlug(data.slug ?? entry.name),
      uuid: data.uuid ?? entry.name,
      category: data.category ?? "",
      description: data.description ?? "",
      thumbnail: parseThumbnail(data.thumbnail),
      created: history[0]?.date ?? null,
      updated: history[history.length - 1]?.date ?? null,
      history
    };
    await writeJson(path.join(articleDir, entry.name, "info.json"), info);
    if (data.draft === true) {
      drafts += 1;
      continue;
    }
    const existing = slugIndex[info.slug];
    if (existing) {
      throw new Error(
        `duplicate slug "${info.slug}": ${existing} and ${info.uuid}`
      );
    }
    const { history: _history, ...summary } = info;
    manifest.push({ ...summary, editors: summarizeEditors(history) });
    slugIndex[info.slug] = info.uuid;
  }
  await writeJson(path.join(contentDir, "article.json"), manifest);
  await writeJson(path.join(contentDir, "slug-index.json"), slugIndex);
  console.info(
    `article.json: ${manifest.length} posts${drafts > 0 ? ` (${drafts} drafts excluded)` : ""}`
  );
}
async function generateCategoriesList(contentDir) {
  const categoriesDir = path.join(contentDir, "categories");
  await ensureDir(categoriesDir);
  const files = await fs.readdir(categoriesDir);
  const categories = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(categoriesDir, file), "utf-8");
    categories.push(JSON.parse(raw));
  }
  await writeJson(path.join(contentDir, "categories.json"), categories);
  console.info(`categories.json: ${categories.length} categories`);
}
async function generateManifests(contentDir) {
  await generateArticleLists(contentDir);
  await generateCategoriesList(contentDir);
}

// src/cli/index.ts
var USAGE = `Usage: hagaki <command>

Commands:
  generate [--content-dir <path>]   Generate article.json / slug-index.json /
                                    categories.json / article/*/info.json for a
                                    hagaki content directory (default ./content)
`;
async function main() {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case "generate": {
      const { values } = parseArgs({
        args: rest,
        options: {
          "content-dir": { type: "string", default: "./content" }
        }
      });
      await generateManifests(
        path2.resolve(process.cwd(), values["content-dir"])
      );
      return;
    }
    case void 0:
    case "help":
    case "--help":
    case "-h":
      process.stdout.write(USAGE);
      return;
    default:
      process.stderr.write(`hagaki: unknown command "${command}"

`);
      process.stderr.write(USAGE);
      process.exit(2);
  }
}
main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
