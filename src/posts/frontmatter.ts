import { toUrlSlug } from "../shared/slug.js";
import type { PostDetail } from "../types.js";

export interface PostFrontmatterOptions {
    /**
     * Supplies the `YYYY-MM-DD` stamp used when the post has no date yet.
     * Injectable for tests; defaults to the real clock.
     */
    today?: () => string;
}

function defaultToday(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Build the canonical frontmatter for an article's `index.md`.
 *
 *   - `category` is pinned to a slug so it always matches a
 *     `content/categories/<slug>.json` entry (the editor field is free text);
 *   - `date` is kept as-is when the post already has one and stamped with
 *     today's date otherwise, so a freshly created post sorts correctly in
 *     date-ordered listings;
 *   - `image` is only written when it has a value.
 */
export function postFrontmatter(
    post: PostDetail,
    options?: PostFrontmatterOptions,
): Record<string, string> {
    const today = options?.today ?? defaultToday;
    const frontmatter: Record<string, string> = {
        title: post.title,
        slug: post.slug,
        uuid: post.uuid,
        category: post.category ? toUrlSlug(post.category) : "",
        description: post.description,
        date: post.date || today(),
    };
    if (post.image) frontmatter.image = post.image;
    return frontmatter;
}
