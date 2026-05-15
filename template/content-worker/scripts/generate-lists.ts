import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, "../content");
const WIKI_DIR = path.join(CONTENT_DIR, "wiki");
const CATEGORIES_DIR = path.join(CONTENT_DIR, "categories");
const IMG_DIR = path.join(CONTENT_DIR, "img");

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

async function generateWikiList() {
    await ensureDir(WIKI_DIR);
    const files = await fs.readdir(WIKI_DIR);
    const posts: Array<Record<string, unknown>> = [];
    for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const raw = await fs.readFile(path.join(WIKI_DIR, file), "utf-8");
        const { data } = matter(raw);
        if (!data.slug) {
            console.warn(`slug missing in ${file}`);
        }
        posts.push({
            title: data.title ?? "",
            slug: toUrlSlug(data.slug ?? path.basename(file, ".md")),
            date: data.date ?? "",
            description: data.description ?? "",
            category: data.category ?? "",
            image: data.image || null,
        });
    }
    await fs.writeFile(
        path.join(CONTENT_DIR, "wiki.json"),
        `${JSON.stringify(posts, null, 2)}\n`,
    );
    console.info(`wiki.json: ${posts.length} posts`);
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

async function generateImagesList() {
    await ensureDir(IMG_DIR);
    const files = await fs.readdir(IMG_DIR);
    const images = files.filter((f) => !f.startsWith("."));
    await fs.writeFile(
        path.join(CONTENT_DIR, "img.json"),
        `${JSON.stringify(images, null, 2)}\n`,
    );
    console.info(`img.json: ${images.length} images`);
}

async function main() {
    await generateWikiList();
    await generateCategoriesList();
    await generateImagesList();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
