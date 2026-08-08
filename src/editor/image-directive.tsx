"use client";

import type {
    DirectiveDescriptor,
    DirectiveEditorProps,
} from "@mdxeditor/editor";
import { type CSSProperties, useEffect, useState } from "react";
import {
    imgDirectiveMetaFromAttrs,
    isPendingImageId,
} from "../markdown/img-directive.js";
import {
    getPending,
    idFromPendingUrl,
    subscribe,
} from "../pending-images/store.js";
import { Image } from "../render/Image.js";

/**
 * `::img` directive editor. Renders the exact same `<Image>` component the
 * read-only view uses (URL resolution via `<HagakiImageConfig>`), so the
 * editor preview and the published page can't drift apart visually. While an
 * upload is still in flight (`id="pending:<uuid>"`) it shows the local blob
 * preview with an uploading overlay instead.
 */
export const imageDirectiveDescriptor: DirectiveDescriptor = {
    name: "img",
    type: "leafDirective",
    testNode: (node) => node.name === "img",
    attributes: ["id", "blurhash", "w", "h", "alt"],
    hasChildren: false,
    Editor: ImageDirectiveEditor,
};

function ImageDirectiveEditor({ mdastNode }: DirectiveEditorProps) {
    const meta = imgDirectiveMetaFromAttrs(mdastNode.attributes ?? {});
    if (isPendingImageId(meta.id)) {
        return <PendingImage id={meta.id} alt={meta.alt} />;
    }
    return (
        <Image
            imageId={meta.id}
            blurHash={meta.blurhash}
            width={meta.width}
            height={meta.height}
            alt={meta.alt}
        />
    );
}

const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0006",
    color: "#fff",
    fontSize: "0.8rem",
    lineHeight: 1.4,
};

function PendingImage({ id, alt }: { id: string; alt?: string }) {
    const pendingId = idFromPendingUrl(id);
    const entry = pendingId ? getPending(pendingId) : undefined;
    const [processing, setProcessing] = useState(
        entry ? !entry.processed : false,
    );
    useEffect(() => {
        if (!pendingId) return;
        const update = () => {
            const current = getPending(pendingId);
            setProcessing(current ? !current.processed : false);
        };
        update();
        return subscribe(update);
    }, [pendingId]);

    // Session state gone (e.g. page reload while an upload was in flight):
    // there is nothing to preview, and the save flow refuses to commit it.
    if (!entry) {
        return (
            <span
                data-hagaki-pending-img="lost"
                style={{
                    display: "inline-block",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.5rem",
                    background: "#f003",
                    fontSize: "0.8rem",
                }}
            >
                image upload lost — re-insert this image
            </span>
        );
    }

    return (
        <span
            data-hagaki-pending-img=""
            style={{
                position: "relative",
                display: "inline-block",
                overflow: "hidden",
                lineHeight: 0,
                borderRadius: "0.5rem",
            }}
        >
            <img
                src={entry.previewBlobUrl}
                alt={alt ?? ""}
                style={{
                    display: "block",
                    maxWidth: "100%",
                    height: "auto",
                    opacity: processing ? 0.6 : 1,
                    transition: "opacity 200ms ease-in",
                }}
            />
            {processing && <span style={overlayStyle}>uploading…</span>}
        </span>
    );
}
