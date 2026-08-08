/**
 * MDX `<Image />` representation of an uploaded image:
 *
 *   <Image imageId="<uuid>" blurHash64="<base64>" width="1920" height="1080" alt="…" />
 *
 * The markdown (MDX) body only carries the image `imageId` (which doubles as
 * the `<id>.avif` file name in the repo) plus enough metadata to render a
 * blurhash placeholder before any bytes arrive. Where the image is actually
 * served from is decided at render time by the caller (pending preview URL
 * while editing, CDN URL once committed) — the consumer maps the `Image`
 * component to `hagaki/react`'s `<Image>` in its MDX/remark pipeline.
 *
 * The prop names match `hagaki/react`'s `<Image>` exactly, so an MDX
 * renderer can pass `components={{ Image }}` with no adapter.
 */

import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { blurhashFromBase64, blurhashToBase64 } from "./blurhash64.js";

export const IMAGE_COMPONENT_NAME = "Image";

export interface ImageComponentAttrs {
    /** uuid — doubles as the `<id>.avif` file name in the repo. */
    id: string;
    /**
     * Raw blurhash. Serialized as the base64 `blurHash64` attribute (raw
     * base83 contains `{`/`}` which JSX attributes can't carry safely).
     */
    blurhash?: string;
    width?: number;
    height?: number;
    alt?: string;
}

/** Image ids are uuids; anything else in an `imageId` attribute is ignored. */
const UUID_REGEX = /^[a-f0-9-]{36}$/i;

/** Largest dimension we'll trust from an (untrusted-ish) attribute value. */
const MAX_IMAGE_DIMENSION = 20000;

/**
 * JSX string attribute values have no escape sequence we want to rely on,
 * and a raw `"` or newline would corrupt the serialized tag — strip both so
 * a malicious/odd alt text can't break the MDX around it.
 */
function cleanAttrValue(value: string): string {
    return value.replace(/["{}<>]/g, "").replace(/[\r\n]+/g, " ");
}

/**
 * Parse a `width`/`height` attribute into a sane positive integer, or
 * `undefined`. Rejects `NaN`, `Infinity`, zero, negatives and absurdly large
 * values so a malformed attribute can't drive a huge buffer allocation
 * downstream (e.g. the server-side blurhash decode).
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
 * Generate the `<Image … />` MDX for an image. All attribute values are
 * plain JSX string attributes (`width="1920"`, not `width={1920}`) so the
 * markup survives editors that only round-trip string props; `hagaki/react`'s
 * `<Image>` coerces them back to numbers. `alt` is included whenever it is a
 * string (even empty) so editors round-trip it faithfully.
 */
export function imageComponentMarkdown(attrs: ImageComponentAttrs): string {
    const parts = [`imageId="${cleanAttrValue(attrs.id)}"`];
    if (attrs.blurhash) {
        parts.push(
            `blurHash64="${cleanAttrValue(blurhashToBase64(attrs.blurhash))}"`,
        );
    }
    if (isValidDimension(attrs.width)) {
        parts.push(`width="${Math.floor(attrs.width)}"`);
    }
    if (isValidDimension(attrs.height)) {
        parts.push(`height="${Math.floor(attrs.height)}"`);
    }
    if (attrs.alt != null) parts.push(`alt="${cleanAttrValue(attrs.alt)}"`);
    return `<${IMAGE_COMPONENT_NAME} ${parts.join(" ")} />`;
}

/** mdast-util-mdx-jsx attribute node (structural — avoids the dep on types). */
export interface MdxJsxAttributeLike {
    type?: string;
    name?: string | null;
    value?:
        | string
        | null
        | undefined
        | { type?: string; value?: string | null };
}

interface MdxNodeLike {
    type: string;
    name?: string | null;
    attributes?: MdxJsxAttributeLike[];
    children?: MdxNodeLike[];
}

export function isImageComponentNode(node: {
    type: string;
    name?: string | null;
}): boolean {
    return (
        (node.type === "mdxJsxFlowElement" ||
            node.type === "mdxJsxTextElement") &&
        node.name === IMAGE_COMPONENT_NAME
    );
}

/**
 * Read one attribute value off an mdxJsx attribute list. String literals are
 * returned as-is; expression values (`width={1920}`) contribute their raw
 * expression text, so simple numeric/string expressions still parse.
 */
function attrValue(
    attributes: MdxJsxAttributeLike[] | null | undefined,
    name: string,
): string | undefined {
    for (const attr of attributes ?? []) {
        if (attr?.type !== "mdxJsxAttribute" || attr.name !== name) continue;
        const { value } = attr;
        if (typeof value === "string") return value;
        if (value && typeof value === "object") {
            const raw = value.value ?? undefined;
            if (raw == null) return undefined;
            // `{"…"}` / `{'…'}` string-literal expressions → unquote.
            const m = /^\s*(["'])(.*)\1\s*$/s.exec(raw);
            return m ? m[2] : raw.trim();
        }
        return undefined;
    }
    return undefined;
}

/**
 * Validate and normalize the attributes of a parsed `<Image />` mdxJsx node.
 * Returns `undefined` when the `imageId` is missing or isn't a uuid — such
 * elements should be treated as inert.
 */
export function parseImageComponentAttributes(
    attributes: MdxJsxAttributeLike[] | null | undefined,
): ImageComponentAttrs | undefined {
    const id = attrValue(attributes, "imageId");
    if (!id || !UUID_REGEX.test(id)) return undefined;
    return {
        id,
        blurhash: blurhashFromBase64(attrValue(attributes, "blurHash64")),
        width: parseDimension(attrValue(attributes, "width")),
        height: parseDimension(attrValue(attributes, "height")),
        alt: attrValue(attributes, "alt"),
    };
}

const mdxParser = unified().use(remarkParse).use(remarkMdx);

/**
 * List the ids of every `<Image />` component in an MDX body, in order of
 * first appearance and de-duplicated.
 *
 * Parses with remark-mdx instead of a regex, so `<Image …>` examples inside
 * code blocks don't false-positive and attribute forms (string vs expression)
 * are handled uniformly.
 */
export function extractImageComponentIds(markdown: string): string[] {
    const ids = new Set<string>();
    const walk = (node: MdxNodeLike): void => {
        if (isImageComponentNode(node)) {
            const attrs = parseImageComponentAttributes(node.attributes);
            if (attrs) ids.add(attrs.id);
        }
        if (node.children) for (const c of node.children) walk(c);
    };
    walk(mdxParser.parse(markdown) as MdxNodeLike);
    return [...ids];
}
