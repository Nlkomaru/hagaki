import type { PostDetail } from "hagaki";
import { v4 as uuidv4 } from "uuid";

/**
 * A brand-new post gets its uuid minted up front (in the loader) rather than
 * at save time. `knownUuid` lets a reload reuse the uuid carried in the URL
 * (`?uuid=`) so saving twice — once before the CDN manifest catches up — still
 * targets the same `content/article/<uuid>/index.md` instead of creating a
 * duplicate directory for the same slug.
 *
 * `date` is left empty on purpose: hagaki's `postFrontmatter` stamps today's
 * date at save time, so an abandoned draft never carries a date it didn't earn.
 */
export function emptyPost(slug: string, knownUuid?: string): PostDetail {
    return {
        title: "",
        slug,
        uuid: knownUuid || uuidv4(),
        description: "",
        date: "",
        category: "",
        image: "",
        body: "",
    };
}
