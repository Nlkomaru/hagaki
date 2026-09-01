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
declare const IMAGE_COMPONENT_NAME = "Image";
interface ImageComponentAttrs {
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
/**
 * Generate the `<Image … />` MDX for an image. All attribute values are
 * plain JSX string attributes (`width="1920"`, not `width={1920}`) so the
 * markup survives editors that only round-trip string props; `hagaki/react`'s
 * `<Image>` coerces them back to numbers. `alt` is included whenever it is a
 * string (even empty) so editors round-trip it faithfully.
 */
declare function imageComponentMarkdown(attrs: ImageComponentAttrs): string;
/** mdast-util-mdx-jsx attribute node (structural — avoids the dep on types). */
interface MdxJsxAttributeLike {
    type?: string;
    name?: string | null;
    value?: string | null | undefined | {
        type?: string;
        value?: string | null;
    };
}
declare function isImageComponentNode(node: {
    type: string;
    name?: string | null;
}): boolean;
/**
 * Validate and normalize the attributes of a parsed `<Image />` mdxJsx node.
 * Returns `undefined` when the `imageId` is missing or isn't a uuid — such
 * elements should be treated as inert.
 */
declare function parseImageComponentAttributes(attributes: MdxJsxAttributeLike[] | null | undefined): ImageComponentAttrs | undefined;
/**
 * List the ids of every `<Image />` component in an MDX body, in order of
 * first appearance and de-duplicated.
 *
 * Parses with remark-mdx instead of a regex, so `<Image …>` examples inside
 * code blocks don't false-positive and attribute forms (string vs expression)
 * are handled uniformly.
 */
declare function extractImageComponentIds(markdown: string): string[];

export { type ImageComponentAttrs as I, type MdxJsxAttributeLike as M, IMAGE_COMPONENT_NAME as a, isImageComponentNode as b, extractImageComponentIds as e, imageComponentMarkdown as i, parseImageComponentAttributes as p };
