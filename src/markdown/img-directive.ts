/**
 * `::img` leaf-directive helpers.
 *
 * hagaki stores article images as a markdown directive instead of standard
 * image syntax so renderers can map them straight to a React component:
 *
 *   ::img{id="<file>.avif" blurhash="L6PZ…" w="1600" h="900" alt="…"}
 *
 * - `id` is the file name inside the article's `assets/` directory, or a
 *   session-local `pending:<uuid>` placeholder while an upload is in flight.
 * - `blurhash` / `w` / `h` carry the placeholder + intrinsic size so the
 *   viewer can reserve the box and fade the real image in.
 *
 * These helpers are plain string/regex utilities — rendering to React is the
 * consumer's job (remark-directive + a component mapping), hagaki only owns
 * the directive vocabulary and the editing-time rewrites.
 */

export interface ImgDirectiveMeta {
    /** File name under the article's assets dir, or `pending:<uuid>`. */
    id: string;
    blurhash?: string;
    width?: number;
    height?: number;
    alt?: string;
}

/** Largest dimension we'll trust from an (untrusted-ish) attribute value. */
const MAX_IMAGE_DIMENSION = 20000;

function parseDimension(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const i = Math.floor(n);
    if (i < 1 || i > MAX_IMAGE_DIMENSION) return undefined;
    return i;
}

// A whole `::img{…}` directive. Attribute values never contain `}` in the
// serializations we emit (and mdast-util-directive keeps braces on one line),
// so a non-greedy scan to the closing brace is sufficient.
const IMG_DIRECTIVE_RE = /::img\{([^{}\n]*)\}/g;

// `key="value"`, `key='value'` or bare `key=value` / bare `key` — the three
// attribute forms mdast-util-directive may emit.
const ATTR_RE = /([A-Za-z][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'{}]+)))?/g;

export function parseImgDirectiveAttrs(
    attrText: string,
): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const match of attrText.matchAll(ATTR_RE)) {
        const key = match[1];
        if (!key) continue;
        attrs[key] = match[2] ?? match[3] ?? match[4] ?? "";
    }
    return attrs;
}

export function imgDirectiveMetaFromAttrs(
    attrs: Record<string, string | null | undefined>,
): ImgDirectiveMeta {
    return {
        id: attrs.id ?? "",
        blurhash: attrs.blurhash || undefined,
        width: parseDimension(attrs.w ?? undefined),
        height: parseDimension(attrs.h ?? undefined),
        alt: attrs.alt || undefined,
    };
}

function quoteAttr(value: string): string {
    return `"${value.replaceAll('"', "'")}"`;
}

/** Serialize meta back to `::img{…}` (stable attribute order). */
export function imgDirective(meta: ImgDirectiveMeta): string {
    const parts = [`id=${quoteAttr(meta.id)}`];
    if (meta.blurhash) parts.push(`blurhash=${quoteAttr(meta.blurhash)}`);
    if (meta.width != null) parts.push(`w="${meta.width}"`);
    if (meta.height != null) parts.push(`h="${meta.height}"`);
    if (meta.alt) parts.push(`alt=${quoteAttr(meta.alt)}`);
    return `::img{${parts.join(" ")}}`;
}

/**
 * Rewrite every `::img` directive in a markdown body. The replacer receives
 * the decoded meta and the raw directive text; return a replacement string,
 * or `null` to keep the directive as-is.
 */
export function replaceImgDirectives(
    markdown: string,
    replacer: (meta: ImgDirectiveMeta, raw: string) => string | null,
): string {
    return markdown.replace(IMG_DIRECTIVE_RE, (raw, attrText: string) => {
        const meta = imgDirectiveMetaFromAttrs(
            parseImgDirectiveAttrs(attrText),
        );
        return replacer(meta, raw) ?? raw;
    });
}

/** Session-local placeholder ids look like `pending:<uuid>` (the serializer
 * may escape the colon, so `pending\:<uuid>` is accepted too). */
const PENDING_ID_RE = /^pending\\?:/;

export function isPendingImageId(id: string): boolean {
    return PENDING_ID_RE.test(id);
}

/**
 * Unique committed image ids referenced by `::img` directives in a markdown
 * body. `pending:` placeholders are skipped — only files that actually live
 * in the repo are returned.
 */
export function extractImgDirectiveIds(markdown: string): string[] {
    const ids = new Set<string>();
    replaceImgDirectives(markdown, (meta) => {
        if (meta.id && !isPendingImageId(meta.id)) ids.add(meta.id);
        return null;
    });
    return [...ids];
}

export interface ImagePathConfig {
    /**
     * Directory inside the GitHub repository that holds the article's image
     * files, e.g. `content/article/<uuid>/assets/`.
     */
    repoDir: string;
}

function normalizeDir(value: string): string {
    return value.endsWith("/") ? value : `${value}/`;
}

/**
 * Return the repo paths of images that were referenced by `oldBody` but no
 * longer appear in `newBody`. Designed to be piped into `commitFiles`'
 * `deletePaths` so the orphaned image blobs are removed in the same commit
 * that updates the post.
 */
export function diffRemovedImagePaths(
    oldBody: string,
    newBody: string,
    config: ImagePathConfig,
): string[] {
    const repoDir = normalizeDir(config.repoDir);
    const before = extractImgDirectiveIds(oldBody);
    if (before.length === 0) return [];
    const after = new Set(extractImgDirectiveIds(newBody));
    return before.filter((id) => !after.has(id)).map((id) => `${repoDir}${id}`);
}
