/**
 * `hagaki/react` — SSR-safe React components for rendering hagaki content.
 *
 * This entry deliberately contains no editor code: it can be imported from
 * server loaders / SSR routes without pulling `@mdxeditor/editor` into the
 * bundle. The client-only editor lives in `hagaki/editor`.
 *
 * Markdown (MDX) → React itself is the consumer's job (remark-mdx/MDX + a
 * component mapping); hagaki provides the `<Image>` component that
 * `<Image imageId="…" />` in the body maps to (`components={{ Image }}`),
 * plus the `HagakiImageConfig` provider that tells it how to resolve URLs.
 */
export type {
    HagakiImageConfigProps,
    HagakiImageProps,
    HagakiImageUrlInput,
    HagakiImageUrlResolver,
} from "./render/Image.js";
export {
    defaultImageUrl,
    HagakiImageConfig,
    Image,
} from "./render/Image.js";
