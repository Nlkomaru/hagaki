import { cn } from "~/lib/utils";

export interface BlurhashImageProps {
    src: string;
    alt: string;
    /**
     * `data:image/bmp;base64,...` URL produced server-side from the blurhash
     * (see `app/lib/blurhash-data-url.ts`). Pass it through a TanStack loader
     * so SSR can paint the placeholder before any client JS runs.
     */
    placeholderDataUrl?: string;
    width?: number;
    height?: number;
    className?: string;
}

/**
 * Image with a server-rendered blurhash placeholder. The placeholder is
 * painted as the wrapper's background, and the real image rendered on top —
 * once the bytes arrive, the opaque image visually covers the placeholder
 * with zero client-side decode and no `useEffect`.
 */
export function BlurhashImage({
    src,
    alt,
    placeholderDataUrl,
    width,
    height,
    className,
}: BlurhashImageProps) {
    const aspectRatio = width && height ? `${width} / ${height}` : undefined;
    return (
        <span
            className={cn(
                "relative inline-block overflow-hidden bg-muted rounded-lg",
                className,
            )}
            style={{
                aspectRatio,
                backgroundImage: placeholderDataUrl
                    ? `url(${placeholderDataUrl})`
                    : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            <img
                src={src}
                alt={alt}
                width={width}
                height={height}
                loading="lazy"
                decoding="async"
                className="relative w-full h-full object-cover"
            />
        </span>
    );
}
