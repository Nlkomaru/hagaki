import type { Category } from "../types.js";
import { type ContentContext, categoriesUrl } from "./fetcher.js";

/**
 * Fetch the category manifest. Positioned categories (`hasPosition`) sort
 * first, then alphabetically by slug — the order the pickers render in.
 */
export async function listCategories(ctx: ContentContext): Promise<Category[]> {
    const res = await ctx.fetchImpl(categoriesUrl(ctx));
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
    const categories = (await res.json()) as Category[];
    categories.sort((a, b) => {
        if (a.hasPosition !== b.hasPosition) return a.hasPosition ? -1 : 1;
        return a.slug.localeCompare(b.slug);
    });
    return categories;
}
