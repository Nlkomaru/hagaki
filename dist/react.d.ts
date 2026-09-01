import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode, CSSProperties } from 'react';

interface HagakiImageUrlInput {
    articleId: string;
    imageId: string;
}
type HagakiImageUrlResolver = (input: HagakiImageUrlInput) => string;
/**
 * Default URL layout: an app route that can fall back from CDN to origin
 * storage (e.g. R2) per image. Override via `<HagakiImageConfig urlFor={…}>`
 * or the `urlFor` prop when the app serves images elsewhere (direct CDN, …).
 */
declare const defaultImageUrl: HagakiImageUrlResolver;
interface HagakiImageConfigValue {
    urlFor?: HagakiImageUrlResolver;
    articleId?: string;
}
interface HagakiImageConfigProps extends HagakiImageConfigValue {
    children?: ReactNode;
}
/**
 * Ambient configuration for every `<Image>` below it: how to turn
 * `articleId` + `imageId` into a URL, and (optionally) which article the
 * surrounding page is about so `articleId` can be omitted per image.
 */
declare function HagakiImageConfig(props: HagakiImageConfigProps): react_jsx_runtime.JSX.Element;
interface HagakiImageProps {
    /** Owning article. Falls back to `<HagakiImageConfig articleId={…}>`. */
    articleId?: string;
    /** File name inside the article's assets directory. */
    imageId: string;
    /** Base64-encoded blurhash — the stored MDX form (`blurhash64`). */
    blurHash64?: string;
    /**
     * Intrinsic size — reserves the box via `aspect-ratio` before load.
     * Strings are accepted (and coerced) so the MDX form
     * `<Image width="1920" … />` can map straight onto this component.
     */
    width?: number | string;
    height?: number | string;
    alt?: string;
    /** Explicit src override (e.g. a blob preview URL). Skips `urlFor`. */
    src?: string;
    urlFor?: HagakiImageUrlResolver;
    className?: string;
    style?: CSSProperties;
    /** Wrapper border-radius, any CSS length. Defaults to `0.5rem`. */
    borderRadius?: string;
}
declare function Image(props: HagakiImageProps): react_jsx_runtime.JSX.Element;

export { HagakiImageConfig, type HagakiImageConfigProps, type HagakiImageProps, type HagakiImageUrlInput, type HagakiImageUrlResolver, Image, defaultImageUrl };
