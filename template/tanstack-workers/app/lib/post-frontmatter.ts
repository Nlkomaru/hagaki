import type { WikiPostDetail } from "hagaki";
import { toUrlSlug } from "hagaki";
import { v4 as uuidv4 } from "uuid";

/**
 * A brand-new post gets its uuid minted up front (in the loader) rather than
 * at save time. `knownUuid` lets a reload reuse the uuid carried in the URL
 * (`?uuid=`) so saving twice — once before the CDN manifest catches up — still
 * targets the same `content/article/<uuid>/index.md` instead of creating a
 * duplicate directory for the same slug.
 */
export function emptyPost(slug: string, knownUuid?: string): WikiPostDetail {
    return {
        title: "",
        slug,
        uuid: knownUuid || uuidv4(),
        description: "",
        date: new Date().toISOString().slice(0, 10),
        category: "",
        image: "",
        body: "",
    };
}

export function postFrontmatter(post: WikiPostDetail) {
    return {
        title: post.title,
        slug: post.slug,
        uuid: post.uuid,
        // The editor's category field is free-text; pin it to a slug so it
        // always matches a `content/categories/<slug>.json` entry.
        category: post.category ? toUrlSlug(post.category) : "",
        description: post.description,
        image: post.image || "",
    };
}
