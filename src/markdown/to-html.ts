import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { resolveCdnUrl } from "../api/url.js";
import { decodeImageTitle } from "../image/title.js";
import { blurhashToDataUrl } from "./blurhash-data-url.js";
import {
    IMAGE_DIRECTIVE_NAME,
    parseImageDirectiveAttributes,
} from "./directive.js";

interface HastNode {
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: HastNode[];
}

function collect(
    node: HastNode | undefined,
    tagName: string,
    out: HastNode[],
): void {
    if (!node) return;
    // Skip subtrees already expanded by the `::img` directive plugin — their
    // inner `<img>`s must not be re-wrapped by the legacy hydration pass.
    if (node.properties && "data-hagaki-img" in node.properties) return;
    if (node.type === "element" && node.tagName === tagName) out.push(node);
    if (node.children) for (const c of node.children) collect(c, tagName, out);
}

type StyleValue = string | number | false | null | undefined;

function styleToString(style: Record<string, StyleValue>): string {
    return Object.entries(style)
        .filter((entry): entry is [string, string | number] => {
            const value = entry[1];
            return value !== false && value != null;
        })
        .map(([property, value]) => `${property}:${value}`)
        .join(";");
}

export interface HydrateImagesOptions {
    cdnBaseUrl: string;
    /** Wrapper border-radius, in any CSS length. Defaults to `0.5rem`. */
    borderRadius?: string;
}

interface ImageSpanInput {
    /** Fully resolved display URL of the real image (may be empty). */
    src: string;
    alt: string;
    blurhash?: string;
    width?: number;
    height?: number;
    borderRadius: string;
}

/**
 * Build the shared `<span data-hagaki-img>` structure:
 *
 *   1. A blurhash placeholder rendered as a real `<img>` (data URL) sitting
 *      absolutely behind the actual image. CSS `filter: blur(...)` smooths
 *      out the 32px decoded pixels so it reads as a hint of the final image.
 *   2. The real `<img>` on top, with `opacity:0` and an inline `onload`
 *      handler that flips it to `1` so the browser fades from placeholder to
 *      photo. The handler lives in the HTML attribute itself — no React
 *      effect, no client-side module — so the transition runs without
 *      shipping any extra JS.
 *
 * The wrapper reserves the right box via `aspect-ratio`. Used by both the
 * legacy `![alt](url "blurhash=...")` hydration pass and the `::img`
 * directive renderer so the two forms look identical.
 */
function buildImageSpan(input: ImageSpanInput): {
    properties: Record<string, unknown>;
    children: HastNode[];
} {
    const { src, alt, blurhash, width, height, borderRadius } = input;
    const placeholder = blurhash
        ? blurhashToDataUrl(blurhash, width, height)
        : "";

    const realImg: HastNode = {
        type: "element",
        tagName: "img",
        properties: {
            src,
            alt,
            loading: "lazy",
            decoding: "async",
            ...(width ? { width } : {}),
            ...(height ? { height } : {}),
            style: styleToString({
                position: "relative",
                display: "block",
                width: "100%",
                height: "auto",
                // Fade in once the bytes arrive. Inline onload + style
                // mutation keeps this client-JS-free.
                opacity: placeholder ? 0 : 1,
                transition: "opacity 350ms ease-in",
            }),
            ...(placeholder
                ? {
                      onload: "this.style.opacity=1",
                      onerror: "this.style.opacity=1",
                  }
                : {}),
        },
        children: [],
    };

    const children: HastNode[] = [];
    if (placeholder) {
        children.push({
            type: "element",
            tagName: "img",
            properties: {
                src: placeholder,
                alt: "",
                "aria-hidden": "true",
                style: styleToString({
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    "object-fit": "cover",
                    // Blur smooths the 32px decoded source so it
                    // reads as a soft hint of the final photo.
                    filter: "blur(18px)",
                    transform: "scale(1.1)",
                }),
            },
            children: [],
        });
    }
    children.push(realImg);

    return {
        properties: {
            "data-hagaki-img": "",
            style: styleToString({
                position: "relative",
                display: "inline-block",
                overflow: "hidden",
                "line-height": 0,
                background: "#0001",
                "border-radius": borderRadius,
                "aspect-ratio":
                    width && height ? `${width}/${height}` : undefined,
                "max-width": width && height ? "100%" : undefined,
                width: width && height ? `${width}px` : undefined,
            }),
        },
        children,
    };
}

/**
 * rehype plugin that rewrites every `<img>` produced from legacy markdown
 * (`![alt](url "blurhash=..&w=..&h=..")`) into the shared
 * `<span data-hagaki-img>` wrapper (see {@link buildImageSpan}). The actual
 * `src` is resolved against the configured CDN base.
 */
function rehypeHydrateImages(options: HydrateImagesOptions) {
    const borderRadius = options.borderRadius ?? "0.5rem";
    return (tree: HastNode) => {
        // Collect every `<img>` up front; we mutate each one into a wrapping
        // `<span>` that contains fresh child nodes, so a live recursive walk
        // would re-enter the freshly-inserted children and loop forever.
        const imgs: HastNode[] = [];
        collect(tree, "img", imgs);
        for (const img of imgs) {
            const props = img.properties ?? {};
            const src = typeof props.src === "string" ? props.src : "";
            const alt = typeof props.alt === "string" ? props.alt : "";
            const title =
                typeof props.title === "string" ? props.title : undefined;
            const meta = decodeImageTitle(title);
            const built = buildImageSpan({
                src: resolveCdnUrl(src, options.cdnBaseUrl),
                alt,
                blurhash: meta.blurhash,
                width: meta.width,
                height: meta.height,
                borderRadius,
            });
            img.tagName = "span";
            img.properties = built.properties;
            img.children = built.children;
        }
    };
}

interface MdastNode {
    type: string;
    name?: string;
    attributes?: Record<string, string | null | undefined>;
    children?: MdastNode[];
    data?: Record<string, unknown>;
    value?: string;
    position?: {
        start?: { offset?: number };
        end?: { offset?: number };
    };
}

function visitMdast(node: MdastNode, fn: (node: MdastNode) => void): void {
    fn(node);
    if (node.children) for (const c of node.children) visitMdast(c, fn);
}

/**
 * remark plugin that expands `::img{id="..." blurhash="..." w=".." h=".."
 * alt=".."}` leaf directives into the same `<span data-hagaki-img>`
 * structure as {@link rehypeHydrateImages}, via mdast `data.hName` /
 * `hProperties` / `hChildren` so `remark-rehype` emits it directly.
 *
 * Only `img` leaf directives are touched; every other directive (admonitions
 * etc.) is left for downstream handlers.
 */
function remarkImageDirectives(options: MarkdownToHtmlOptions) {
    const borderRadius = options.borderRadius ?? "0.5rem";
    // `unknown` + cast: our minimal MdastNode shape is structurally narrower
    // than unist's `Node` (its `data`/`position` types differ), so typing the
    // parameter directly would fail unified's Plugin signature.
    return (tree: unknown) => {
        visitMdast(tree as MdastNode, (node) => {
            if (node.type !== "leafDirective") return;
            if (node.name !== IMAGE_DIRECTIVE_NAME) return;
            const attrs = parseImageDirectiveAttributes(node.attributes);
            node.data ??= {};
            const data = node.data;
            if (!attrs) {
                // Missing/invalid uuid — render as an inert empty span
                // instead of letting the raw directive leak into the page.
                data.hName = "span";
                data.hProperties = {};
                data.hChildren = [];
                return;
            }
            const built = buildImageSpan({
                src: options.imageUrlFor ? options.imageUrlFor(attrs.id) : "",
                alt: attrs.alt ?? "",
                blurhash: attrs.blurhash,
                width: attrs.width,
                height: attrs.height,
                borderRadius,
            });
            data.hName = "span";
            data.hProperties = built.properties;
            data.hChildren = built.children;
        });
    };
}

const DIRECTIVE_TYPES = new Set([
    "textDirective",
    "leafDirective",
    "containerDirective",
]);

/**
 * remark plugin that restores every directive node NOT claimed by
 * {@link remarkImageDirectives} (no `data.hName`) back to its literal source
 * text. remark-directive is only in the pipeline for `::img`; without this
 * pass, ordinary prose that happens to parse as a directive — `12:30`,
 * `参照:example`, a committed `:::note` block — would fall through to
 * remark-rehype's unknown-node handling and render as an empty `<div>`,
 * silently eating the text. Must run after {@link remarkImageDirectives}.
 */
function remarkRestoreUnknownDirectives() {
    // `unknown` + cast for the same reason as {@link remarkImageDirectives}.
    return (tree: unknown, file: { value?: unknown }) => {
        const source = typeof file.value === "string" ? file.value : "";
        const restore = (node: MdastNode): void => {
            if (!node.children) return;
            node.children = node.children.map((child): MdastNode => {
                if (
                    DIRECTIVE_TYPES.has(child.type) &&
                    !(child.data && "hName" in child.data)
                ) {
                    const start = child.position?.start?.offset;
                    const end = child.position?.end?.offset;
                    // Positions are always present on freshly parsed nodes;
                    // if one is somehow missing, leave the node alone rather
                    // than guess at its source text.
                    if (start == null || end == null) return child;
                    const literal = source.slice(start, end);
                    if (child.type === "textDirective") {
                        return { type: "text", value: literal };
                    }
                    return {
                        type: "paragraph",
                        children: [{ type: "text", value: literal }],
                    };
                }
                restore(child);
                return child;
            });
        };
        restore(tree as MdastNode);
    };
}

const processor = (options: MarkdownToHtmlOptions) =>
    unified()
        .use(remarkParse)
        .use(remarkDirective)
        .use(remarkGfm)
        .use(remarkImageDirectives, options)
        .use(remarkRestoreUnknownDirectives)
        .use(remarkRehype)
        .use(rehypeHydrateImages, options)
        .use(rehypeStringify);

export interface MarkdownToHtmlOptions extends HydrateImagesOptions {
    /**
     * Resolve a `::img` directive id to its display URL (e.g. the CDN URL of
     * the committed `<id>.avif`). When omitted, directives render with an
     * empty `src` — read-only pages should always pass this.
     */
    imageUrlFor?: (id: string) => string;
}

/**
 * Convert a markdown body to HTML with image blurhash placeholders pre-baked
 * into the output. Designed for server loaders so the read-only view can
 * render straight to the DOM with no client-side parsing pass.
 */
export async function markdownToHtml(
    markdown: string,
    options: MarkdownToHtmlOptions,
): Promise<string> {
    const file = await processor(options).process(markdown);
    return String(file);
}
