"use client";

import {
    type CSSProperties,
    createContext,
    type ReactNode,
    useContext,
    useMemo,
    useState,
} from "react";
import { blurhashToDataUrl } from "../markdown/blurhash-data-url.js";
import { blurhashFromBase64 } from "../markdown/blurhash64.js";

export interface HagakiImageUrlInput {
    articleId: string;
    imageId: string;
}

export type HagakiImageUrlResolver = (input: HagakiImageUrlInput) => string;

/**
 * Default URL layout: an app route that can fall back from CDN to origin
 * storage (e.g. R2) per image. Override via `<HagakiImageConfig urlFor={…}>`
 * or the `urlFor` prop when the app serves images elsewhere (direct CDN, …).
 */
export const defaultImageUrl: HagakiImageUrlResolver = ({
    articleId,
    imageId,
}) => `/api/images/${articleId}/${imageId}`;

interface HagakiImageConfigValue {
    urlFor?: HagakiImageUrlResolver;
    articleId?: string;
}

const HagakiImageContext = createContext<HagakiImageConfigValue>({});

export interface HagakiImageConfigProps extends HagakiImageConfigValue {
    children?: ReactNode;
}

/**
 * Ambient configuration for every `<Image>` below it: how to turn
 * `articleId` + `imageId` into a URL, and (optionally) which article the
 * surrounding page is about so `articleId` can be omitted per image.
 */
export function HagakiImageConfig(props: HagakiImageConfigProps) {
    const { urlFor, articleId, children } = props;
    const value = useMemo(() => ({ urlFor, articleId }), [urlFor, articleId]);
    return (
        <HagakiImageContext.Provider value={value}>
            {children}
        </HagakiImageContext.Provider>
    );
}

export interface HagakiImageProps {
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

/**
 * Article image with a blurhash placeholder baked in:
 *
 *   1. The blurhash is decoded to a tiny `data:image/bmp` URL rendered as an
 *      absolutely-positioned `<img>` behind the real one; CSS `blur()`
 *      smooths the 32px decode into a soft hint of the final photo.
 *   2. The real `<img>` starts at `opacity: 0` and fades in on `onLoad`.
 *      The ref callback checks `complete` so an image that finished loading
 *      before hydration (SSR + cache) doesn't stay invisible.
 *
 * The wrapper reserves the final box via `aspect-ratio`, so the page doesn't
 * shift when the bytes arrive. SSR-safe: the placeholder and layout render
 * on the server, only the fade is client behaviour.
 */
const MAX_IMAGE_DIMENSION = 20000;

function toDimension(value: number | string | undefined): number | undefined {
    if (value == null) return undefined;
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return undefined;
    const i = Math.floor(n);
    if (i < 1 || i > MAX_IMAGE_DIMENSION) return undefined;
    return i;
}

export function Image(props: HagakiImageProps) {
    const ctx = useContext(HagakiImageContext);
    const articleId = props.articleId ?? ctx.articleId ?? "";
    const urlFor = props.urlFor ?? ctx.urlFor ?? defaultImageUrl;
    const src = props.src ?? urlFor({ articleId, imageId: props.imageId });
    const blurHash = blurhashFromBase64(props.blurHash64);
    const width = toDimension(props.width);
    const height = toDimension(props.height);

    const placeholder = useMemo(
        () => (blurHash ? blurhashToDataUrl(blurHash, width, height) : ""),
        [blurHash, width, height],
    );
    const [loaded, setLoaded] = useState(!placeholder);

    const hasBox = width != null && height != null;
    const wrapperStyle: CSSProperties = {
        position: "relative",
        display: "inline-block",
        overflow: "hidden",
        lineHeight: 0,
        background: "#0001",
        borderRadius: props.borderRadius ?? "0.5rem",
        ...(hasBox
            ? {
                  aspectRatio: `${width}/${height}`,
                  width: `${width}px`,
                  maxWidth: "100%",
              }
            : {}),
        ...props.style,
    };

    return (
        <span
            data-hagaki-img=""
            className={props.className}
            style={wrapperStyle}
        >
            {placeholder && (
                <img
                    src={placeholder}
                    alt=""
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "blur(18px)",
                        transform: "scale(1.1)",
                    }}
                />
            )}
            <img
                ref={(el) => {
                    // Already-complete before hydration → onLoad never fires.
                    if (el?.complete) setLoaded(true);
                }}
                src={src}
                alt={props.alt ?? ""}
                loading="lazy"
                decoding="async"
                {...(width != null ? { width } : {})}
                {...(height != null ? { height } : {})}
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(true)}
                suppressHydrationWarning
                style={{
                    position: "relative",
                    display: "block",
                    width: "100%",
                    height: "auto",
                    opacity: loaded ? 1 : 0,
                    transition: "opacity 350ms ease-in",
                }}
            />
        </span>
    );
}
