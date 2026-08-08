import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, "../content");
const ARTICLE_DIR = path.join(CONTENT_DIR, "article");
const CATEGORIES_DIR = path.join(CONTENT_DIR, "categories");

function toUrlSlug(str: string): string {
    return encodeURIComponent(
        str
            .normalize("NFKC")
            .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
                String.fromCharCode(s.charCodeAt(0) - 0xfee0),
            )
            .replace(/\s+/g, "-")
            .replace(/[　]/g, "-")
            .replace(/--+/g, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase(),
    );
}

async function ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
}

/**
 * Scan `content/article/<uuid>/index.md` and emit `article.json` so the
 * editor / read-only view can resolve a slug to a uuid (and pull post
 * metadata) without listing every file at runtime.
 */
async function generateArticleList() {
    await ensureDir(ARTICLE_DIR);
    const entries = await fs.readdir(ARTICLE_DIR, { withFileTypes: true });
    const posts: Array<Record<string, unknown>> = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const indexPath = path.join(ARTICLE_DIR, entry.name, "index.md");
        let raw: string;
        try {
            raw = await fs.readFile(indexPath, "utf-8");
        } catch {
            console.warn(`skip ${entry.name}: missing index.md`);
            continue;
        }
        const { data } = matter(raw);
        if (!data.uuid) {
            console.warn(`uuid missing in ${entry.name}/index.md`);
        }
        if (!data.slug) {
            console.warn(`slug missing in ${entry.name}/index.md`);
        }
        posts.push({
            title: data.title ?? "",
            slug: toUrlSlug(data.slug ?? entry.name),
            uuid: data.uuid ?? entry.name,
            date: data.date ?? "",
            description: data.description ?? "",
            category: data.category ?? "",
            image: data.image || null,
        });
    }
    await fs.writeFile(
        path.join(CONTENT_DIR, "article.json"),
        `${JSON.stringify(posts, null, 2)}\n`,
    );
    console.info(`article.json: ${posts.length} posts`);
}

async function generateCategoriesList() {
    await ensureDir(CATEGORIES_DIR);
    const files = await fs.readdir(CATEGORIES_DIR);
    const categories: Array<Record<string, unknown>> = [];
    for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const raw = await fs.readFile(path.join(CATEGORIES_DIR, file), "utf-8");
        categories.push(JSON.parse(raw));
    }
    await fs.writeFile(
        path.join(CONTENT_DIR, "categories.json"),
        `${JSON.stringify(categories, null, 2)}\n`,
    );
    console.info(`categories.json: ${categories.length} categories`);
}

async function main() {
    await generateArticleList();
    await generateCategoriesList();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
