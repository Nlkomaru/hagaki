import matter from "gray-matter";
import type { ListPostsOptions, Post, PostDetail } from "../types.js";
import { type ContentContext, postByUuidUrl, postsUrl } from "./fetcher.js";

export async function listPosts(
    ctx: ContentContext,
    options?: ListPostsOptions,
): Promise<Post[]> {
    const res = await ctx.fetchImpl(postsUrl(ctx));
    if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
    const posts = (await res.json()) as Post[];

    if (options?.sortBy) {
        const { sortBy, order = "desc" } = options;
        posts.sort((a, b) => {
            if (sortBy === "date") {
                return order === "asc"
                    ? new Date(a.date).getTime() - new Date(b.date).getTime()
                    : new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            if (sortBy === "title") {
                return order === "asc"
                    ? a.title.localeCompare(b.title)
                    : b.title.localeCompare(a.title);
            }
            return 0;
        });
    }
    return posts;
}

export async function getPostByUuid(
    ctx: ContentContext,
    uuid: string,
): Promise<PostDetail | null> {
    const res = await ctx.fetchImpl(postByUuidUrl(ctx, uuid));
    if (!res.ok) return null;
    const markdown = await res.text();
    const { data, content } = matter(markdown);
    return {
        title: (data.title as string | undefined) ?? "",
        slug: (data.slug as string | undefined) ?? "",
        uuid: (data.uuid as string | undefined) ?? uuid,
        description: (data.description as string | undefined) ?? "",
        date: normalizeDate(data.date),
        category: (data.category as string | undefined) ?? "",
        image: data.image as string | undefined,
        body: content,
    };
}

/**
 * YAML parses an unquoted `date: 2026-08-08` (hand-written or from another
 * tool) into a native `Date`, not a string. Normalize here, at the read
 * boundary — `postFrontmatter` round-trips this value on save, and a Date
 * object leaking through would corrupt the rewritten frontmatter.
 */
function normalizeDate(value: unknown): string {
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return "";
}

/**
 * Resolve a post by its human-facing slug. Fetches the article manifest,
 * looks up the matching uuid, then loads `/article/<uuid>/index.md`. Returns
 * `null` if no post has that slug.
 */
export async function getPostBySlug(
    ctx: ContentContext,
    slug: string,
): Promise<PostDetail | null> {
    const posts = await listPosts(ctx);
    const match = posts.find((p) => p.slug === slug);
    if (!match) return null;
    return getPostByUuid(ctx, match.uuid);
}
