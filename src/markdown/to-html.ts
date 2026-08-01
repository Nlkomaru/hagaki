import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { resolveCdnUrl } from "../api/url.js";
import { decodeImageTitle } from "../image/title.js";
import { blurhashToDataUrl } from "./blurhash-data-url.js";

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

/**
 * rehype plugin that rewrites every `<img>` produced from the markdown into a
 * `<span>` wrapper containing two `<img>` elements:
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
 * The wrapper reserves the right box via `aspect-ratio` and the actual `src`
 * is resolved against the configured CDN base.
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
            const placeholder = meta.blurhash
                ? blurhashToDataUrl(meta.blurhash, meta.width, meta.height)
                : "";

            const realImg: HastNode = {
                type: "element",
                tagName: "img",
                properties: {
                    src: resolveCdnUrl(src, options.cdnBaseUrl),
                    alt,
                    loading: "lazy",
                    decoding: "async",
                    ...(meta.width ? { width: meta.width } : {}),
                    ...(meta.height ? { height: meta.height } : {}),
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

            img.tagName = "span";
            img.properties = {
                "data-hagaki-img": "",
                style: styleToString({
                    position: "relative",
                    display: "inline-block",
                    overflow: "hidden",
                    "line-height": 0,
                    background: "#0001",
                    "border-radius": borderRadius,
                    "aspect-ratio":
                        meta.width && meta.height
                            ? `${meta.width}/${meta.height}`
                            : undefined,
                    "max-width": meta.width && meta.height ? "100%" : undefined,
                    width:
                        meta.width && meta.height
                            ? `${meta.width}px`
                            : undefined,
                }),
            };
            img.children = children;
        }
    };
}

const processor = (options: HydrateImagesOptions) =>
    unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeHydrateImages, options)
        .use(rehypeStringify);

export interface MarkdownToHtmlOptions extends HydrateImagesOptions {}

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
