/**
 * `hagaki/react` — SSR-safe React components for rendering hagaki content.
 *
 * This entry deliberately contains no editor code: it can be imported from
 * server loaders / SSR routes without pulling `@mdxeditor/editor` into the
 * bundle. The client-only editor lives in `hagaki/editor`.
 *
 * Markdown → React itself is the consumer's job (remark-directive + a
 * component mapping); hagaki provides the `<Image>` component that `::img`
 * directives map to, plus the `HagakiImageConfig` provider that tells it how
 * to resolve URLs.
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
