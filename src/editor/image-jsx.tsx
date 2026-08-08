"use client";

import type { JsxComponentDescriptor, JsxEditorProps } from "@mdxeditor/editor";
import { useLexicalNodeRemove } from "@mdxeditor/editor";
import {
    type CSSProperties,
    createContext,
    useCallback,
    useState,
    useSyncExternalStore,
} from "react";
import { blurhashToDataUrl } from "../markdown/blurhash-data-url.js";
import {
    IMAGE_COMPONENT_NAME,
    type ImageComponentAttrs,
    parseImageComponentAttributes,
} from "../markdown/image-jsx.js";
import {
    getPending,
    removePending,
    subscribe,
} from "../pending-images/store.js";

/**
 * Context that carries the image-flow callbacks from `<HagakiEditor>` down to
 * `<HagakiEditor.InsertImage.ComponentButton>`. Provided by
 * `HagakiEditorRoot`; consumers normally never touch it directly.
 */
export interface ImageComponentContextValue {
    /**
     * Analyze the file + start the pending upload, resolving with the
     * attributes for the `<Image />` component to insert.
     */
    onInsertImage?: (file: File) => Promise<ImageComponentAttrs>;
    /** Error sink for failed inserts. Falls back to `console.error`. */
    onError?: (e: unknown) => void;
}

export const ImageComponentContext = createContext<ImageComponentContextValue>(
    {},
);

export interface ImageComponentConfig {
    /**
     * Display URL for a committed image (CDN). Ids not present in the pending
     * store resolve through this.
     */
    previewUrlFor: (id: string) => string;
}

/** Internal: the descriptor smuggles its config to the shared Editor. */
interface ConfiguredImageComponentDescriptor extends JsxComponentDescriptor {
    config: ImageComponentConfig;
}

/**
 * Build a {@link JsxComponentDescriptor} that renders
 * `<Image imageId="…" />` MDX components inside the editor:
 *
 *   - while the pending upload is encoding/uploading — blurhash placeholder
 *     with an "アップロード中…" overlay;
 *   - once uploaded — the temporary Workers preview URL, fading in over the
 *     blurhash;
 *   - on upload error — an inline error with a delete button;
 *   - no pending entry (already committed) — `config.previewUrlFor(id)`.
 *
 * Node selection and Backspace deletion are left to MDXEditor's standard
 * JSX-node behavior. No `source` is set — the MDX body carries no import
 * statement; consumers map the `Image` component at render time.
 */
export function createImageComponentDescriptor(
    config: ImageComponentConfig,
): JsxComponentDescriptor {
    const descriptor: ConfiguredImageComponentDescriptor = {
        name: IMAGE_COMPONENT_NAME,
        kind: "flow",
        props: [
            { name: "imageId", type: "string" },
            { name: "blurHash64", type: "string" },
            { name: "width", type: "string" },
            { name: "height", type: "string" },
            { name: "alt", type: "string" },
        ],
        hasChildren: false,
        // Module-level component so its identity is stable even though the
        // descriptor object itself is rebuilt on every editor render — this
        // keeps React from remounting (and re-fading) every image.
        Editor: ImageComponentEditor,
        config,
    };
    return descriptor;
}

/**
 * Subscribe to the pending store and re-render when the entry for `id`
 * changes. Entries mutate in place, so the snapshot serializes the fields the
 * view depends on instead of relying on object identity.
 */
function usePendingSnapshot(id: string): void {
    const getSnapshot = useCallback(() => {
        const entry = getPending(id);
        if (!entry) return "";
        return `${entry.status} ${entry.previewUrl ?? ""}`;
    }, [id]);
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const SPINNER_CSS = "@keyframes hagaki-img-spin{to{transform:rotate(360deg)}}";

const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    background: "rgba(0,0,0,0.35)",
    color: "#fff",
    fontSize: "0.875rem",
    lineHeight: 1.4,
};

const spinnerStyle: CSSProperties = {
    width: "1.25rem",
    height: "1.25rem",
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    animation: "hagaki-img-spin 0.8s linear infinite",
};

const errorBoxStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    border: "1px solid #dc2626",
    borderRadius: "0.5rem",
    color: "#dc2626",
    fontSize: "0.875rem",
    lineHeight: 1.4,
};

const errorButtonStyle: CSSProperties = {
    padding: "0.125rem 0.5rem",
    border: "1px solid currentcolor",
    borderRadius: "0.25rem",
    background: "transparent",
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
};

function ImageComponentEditor(props: JsxEditorProps) {
    const { mdastNode, descriptor } = props;
    const { config } = descriptor as ConfiguredImageComponentDescriptor;
    const attrs = parseImageComponentAttributes(mdastNode.attributes);
    // Hooks must run unconditionally; an invalid element just subscribes to a
    // key that never exists.
    usePendingSnapshot(attrs?.id ?? "");
    const [loaded, setLoaded] = useState(false);
    const removeNode = useLexicalNodeRemove();

    if (!attrs) {
        return <span style={errorBoxStyle}>画像の指定が不正です</span>;
    }
    const { id, blurhash, width, height, alt } = attrs;
    const entry = getPending(id);

    if (entry?.status === "error") {
        const handleRemove = () => {
            removeNode();
            removePending(id);
        };
        return (
            <span style={errorBoxStyle}>
                画像のアップロードに失敗しました
                <button
                    type="button"
                    style={errorButtonStyle}
                    onClick={handleRemove}
                >
                    削除
                </button>
            </span>
        );
    }

    const placeholder = blurhash
        ? blurhashToDataUrl(blurhash, width, height)
        : "";
    // In-flight entries have no display URL yet; uploaded entries use the
    // temporary Workers preview, committed images resolve through the config.
    const src = entry
        ? entry.status === "uploaded"
            ? (entry.previewUrl ?? "")
            : ""
        : config.previewUrlFor(id);
    const busy = entry?.status === "encoding" || entry?.status === "uploading";

    // Same visual structure as `hagaki/react`'s `<Image>`
    // (`<span data-hagaki-img>`): aspect-ratio reserves the box, the blurhash
    // sits behind, the real image fades in on load.
    const wrapperStyle: CSSProperties = {
        position: "relative",
        display: "inline-block",
        overflow: "hidden",
        lineHeight: 0,
        background: "#0001",
        borderRadius: "0.5rem",
        aspectRatio: width && height ? `${width} / ${height}` : undefined,
        maxWidth: "100%",
        width: width && height ? `${width}px` : undefined,
    };

    return (
        <span data-hagaki-img="" style={wrapperStyle}>
            {placeholder ? (
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
            ) : null}
            {src ? (
                <img
                    src={src}
                    alt={alt ?? ""}
                    width={width}
                    height={height}
                    onLoad={() => setLoaded(true)}
                    onError={() => setLoaded(true)}
                    style={{
                        position: "relative",
                        display: "block",
                        width: "100%",
                        height: "auto",
                        opacity: placeholder && !loaded ? 0 : 1,
                        transition: "opacity 350ms ease-in",
                    }}
                />
            ) : null}
            {busy ? (
                <span style={overlayStyle}>
                    <style>{SPINNER_CSS}</style>
                    <span style={spinnerStyle} />
                    アップロード中…
                </span>
            ) : null}
        </span>
    );
}
