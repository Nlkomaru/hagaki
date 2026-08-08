/**
 * Leaf-directive representation of an uploaded image:
 *
 *   ::img{id="<uuid>" blurhash="<hash>" w="1920" h="1080" alt="..."}
 *
 * The markdown body only carries the image `id` (which doubles as the
 * `<id>.avif` file name in the repo) plus enough metadata to render a
 * blurhash placeholder before any bytes arrive. Where the image is actually
 * served from is decided at render time by the caller (pending preview URL
 * while editing, CDN URL once committed).
 */

import remarkDirective from "remark-directive";
import remarkParse from "remark-parse";
import { unified } from "unified";

export const IMAGE_DIRECTIVE_NAME = "img";

export interface ImageDirectiveAttrs {
    id: string;
    blurhash?: string;
    width?: number;
    height?: number;
    alt?: string;
}

/** Image ids are uuids; anything else in an `id` attribute is ignored. */
const UUID_REGEX = /^[a-f0-9-]{36}$/i;

/** Largest dimension we'll trust from an (untrusted-ish) attribute value. */
const MAX_IMAGE_DIMENSION = 20000;

/**
 * Directive attribute values have no escape sequence for `"`, and a raw
 * newline would terminate the leaf directive early — strip both so a
 * malicious/odd alt text can't corrupt the markdown around it.
 */
function cleanAttrValue(value: string): string {
    return value.replace(/"/g, "").replace(/[\r\n]+/g, " ");
}

/**
 * Parse a `w`/`h` attribute into a sane positive integer, or `undefined`.
 * Mirrors the legacy title parsing: rejects `NaN`, `Infinity`, zero,
 * negatives and absurdly large values so a malformed attribute can't drive a
 * huge buffer allocation downstream (e.g. the server-side blurhash decode).
 */
function parseDimension(value: string | null | undefined): number | undefined {
    if (!value) return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const i = Math.floor(n);
    if (i < 1 || i > MAX_IMAGE_DIMENSION) return undefined;
    return i;
}

function isValidDimension(value: number | undefined): value is number {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 1 &&
        value <= MAX_IMAGE_DIMENSION
    );
}

/**
 * Generate the `::img{...}` markdown for a directive. `width`/`height` are
 * written with the short attribute names `w`/`h`; `alt` is included whenever
 * it is a string (even empty) so editors round-trip it faithfully.
 */
export function imageDirectiveMarkdown(attrs: ImageDirectiveAttrs): string {
    const parts = [`id="${cleanAttrValue(attrs.id)}"`];
    if (attrs.blurhash) {
        parts.push(`blurhash="${cleanAttrValue(attrs.blurhash)}"`);
    }
    if (isValidDimension(attrs.width)) {
        parts.push(`w="${Math.floor(attrs.width)}"`);
    }
    if (isValidDimension(attrs.height)) {
        parts.push(`h="${Math.floor(attrs.height)}"`);
    }
    if (attrs.alt != null) parts.push(`alt="${cleanAttrValue(attrs.alt)}"`);
    return `::${IMAGE_DIRECTIVE_NAME}{${parts.join(" ")}}`;
}

interface DirectiveMdastNode {
    type: string;
    name?: string;
    attributes?: Record<string, string | null | undefined>;
    children?: DirectiveMdastNode[];
}

const directiveParser = unified().use(remarkParse).use(remarkDirective);

/**
 * List the ids of every `::img` directive in a markdown body, in order of
 * first appearance and de-duplicated.
 *
 * Parses with remark-directive instead of a regex: serializers write the
 * `id` attribute in `#<uuid>` shortcut form (mdast-util-directive prefers
 * shortcuts, and MDXEditor round-trips through it), and a regex would also
 * false-positive on `::img{...}` examples inside code blocks. The AST sees
 * both correctly.
 */
export function extractImageDirectiveIds(markdown: string): string[] {
    const ids = new Set<string>();
    const walk = (node: DirectiveMdastNode): void => {
        if (
            node.type === "leafDirective" &&
            node.name === IMAGE_DIRECTIVE_NAME
        ) {
            const id = node.attributes?.id;
            if (id && UUID_REGEX.test(id)) ids.add(id);
        }
        if (node.children) for (const c of node.children) walk(c);
    };
    walk(directiveParser.parse(markdown) as DirectiveMdastNode);
    return [...ids];
}

/**
 * Validate and normalize the raw attribute record of a parsed `img`
 * directive node (mdast `attributes` are plain strings). Returns `undefined`
 * when the `id` is missing or isn't a uuid — such directives should be
 * treated as inert.
 */
export function parseImageDirectiveAttributes(
    attributes: Record<string, string | null | undefined> | null | undefined,
): ImageDirectiveAttrs | undefined {
    const id = attributes?.id;
    if (!id || !UUID_REGEX.test(id)) return undefined;
    return {
        id,
        blurhash: attributes?.blurhash || undefined,
        width: parseDimension(attributes?.w),
        height: parseDimension(attributes?.h),
        alt: attributes?.alt ?? undefined,
    };
}
