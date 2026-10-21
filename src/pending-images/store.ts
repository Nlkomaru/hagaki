import { v4 as uuidv4 } from "uuid";
import {
    analyzeImage,
    encodeAnalyzedImage,
    type ProcessImageOptions,
} from "../image/pipeline.js";
import { extractImageComponentIds } from "../markdown/image-jsx.js";

/**
 * - `"encoding"` — blurhash and dimensions are known, the AVIF encode is
 *   still running.
 * - `"ready"` — `blob` and `previewUrl` are set; the image can be committed.
 * - `"error"` — the encode failed (`error` holds the cause).
 */
export type PendingStatus = "encoding" | "ready" | "error";

export interface PendingEntry {
    /** uuidv4 — doubles as the image id and file name (`<id>.avif`). */
    id: string;
    blurhash: string;
    width: number;
    height: number;
    status: PendingStatus;
    /** Cause of failure when `status === "error"`. */
    error?: unknown;
    /** The encoded image (`image/avif`), set once `status === "ready"`. */
    blob?: Blob;
    /**
     * `blob:` object URL of {@link blob} for the in-editor preview, set once
     * `status === "ready"`. Revoked by {@link removePending} /
     * {@link clearAll}, so never store it anywhere that outlives the entry.
     */
    previewUrl?: string;
    /** Resolves with the encoded blob, rejects if the encode failed. */
    done: Promise<Blob>;
}

/** One image ready to be committed next to the post body. */
export interface PendingImage {
    imageId: string;
    /** `image/avif` bytes. */
    blob: Blob;
}

/**
 * Thrown by {@link collectPendingImages} when an image cannot be committed:
 * its encode failed (`failedIds`) or the store has no entry for it
 * (`missingIds` — typically after a page reload, since the bytes only ever
 * lived in this tab's memory).
 */
export class PendingImageError extends Error {
    constructor(
        message: string,
        readonly failedIds: string[],
        readonly missingIds: string[],
    ) {
        super(message);
        this.name = "PendingImageError";
    }
}

const store = new Map<string, PendingEntry>();
const listeners = new Set<() => void>();

/**
 * This store is browser-only: it holds module-global state and
 * `startPending` drives the canvas/WASM image pipeline. Importing it from a
 * server bundle is fine (pure lookups still work), but the browser-backed
 * operations must fail loudly rather than crash with a cryptic canvas error.
 */
function assertBrowser(api: string): void {
    if (typeof document === "undefined") {
        throw new Error(
            `hagaki/pending-images: ${api}() is browser-only and was called in a non-browser environment`,
        );
    }
}

function notify(): void {
    for (const fn of listeners) fn();
}

function release(entry: PendingEntry): void {
    if (entry.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl);
        entry.previewUrl = undefined;
    }
}

export interface StartPendingInput {
    file: File;
    processOptions?: ProcessImageOptions;
}

/**
 * Resolves as soon as `analyzeImage` finishes (= blurhash and dimensions are
 * known) with a new `"encoding"` entry, so the editor can insert the
 * `<Image />` component and show the placeholder right away. The AVIF encode
 * continues in the background; the entry then moves to `"ready"` (with
 * `blob` + `previewUrl`) or `"error"`, notifying subscribers.
 *
 * `entry.done` tracks the background encode; an internal `.catch(() => {})`
 * keeps its rejection observed when nobody awaits it.
 */
export async function startPending(
    input: StartPendingInput,
): Promise<PendingEntry> {
    assertBrowser("startPending");
    const id = uuidv4();
    const analyzed = await analyzeImage(input.file, input.processOptions);

    const entry: PendingEntry = {
        id,
        blurhash: analyzed.blurhash,
        width: analyzed.width,
        height: analyzed.height,
        status: "encoding",
        // Assigned right below — the background chain needs `entry` in scope.
        done: undefined as unknown as Promise<Blob>,
    };
    entry.done = (async () => {
        try {
            const avif = await encodeAnalyzedImage(
                analyzed,
                input.processOptions,
            );
            const blob = new Blob([avif], { type: "image/avif" });
            entry.blob = blob;
            entry.status = "ready";
            // An entry removed mid-encode must not mint an object URL that
            // nothing would ever revoke.
            if (store.get(id) === entry) {
                entry.previewUrl = URL.createObjectURL(blob);
            }
            notify();
            return blob;
        } catch (e) {
            entry.status = "error";
            entry.error = e;
            notify();
            throw e;
        }
    })();
    entry.done.catch(() => {});

    store.set(id, entry);
    notify();
    return entry;
}

export function getPending(id: string): PendingEntry | undefined {
    return store.get(id);
}

/** Snapshot of every entry, in insertion order. */
export function listPending(): PendingEntry[] {
    return [...store.values()];
}

/**
 * Drop one entry and revoke its preview URL — after the image was removed
 * from the editor, or once a commit containing it succeeded.
 */
export function removePending(id: string): void {
    const entry = store.get(id);
    if (!entry) return;
    store.delete(id);
    release(entry);
    notify();
}

/** Drop every entry and revoke every preview URL. */
export function clearAll(): void {
    for (const entry of store.values()) release(entry);
    store.clear();
    notify();
}

/**
 * True while at least one entry is still encoding — used to disable the
 * save button.
 */
export function hasActive(): boolean {
    for (const entry of store.values()) {
        if (entry.status === "encoding") return true;
    }
    return false;
}

/** True if any entry ended in `status === "error"`. */
export function hasErrors(): boolean {
    for (const entry of store.values()) {
        if (entry.status === "error") return true;
    }
    return false;
}

export function subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

/**
 * Drop `"error"` entries whose id no longer appears in `body`. Deleting an
 * `<Image />` node with Backspace or undo never calls {@link removePending},
 * so without this a failed image would keep {@link hasErrors} true forever.
 * Cheap enough to call from every editor `onChange` (substring match, no
 * parse). Only failed entries are dropped: an undo can bring a node back, and
 * its encoding / ready entry must still be there when it does.
 */
export function sweepOrphanedErrors(body: string): void {
    let changed = false;
    for (const entry of [...store.values()]) {
        if (entry.status === "error" && !body.includes(entry.id)) {
            store.delete(entry.id);
            release(entry);
            changed = true;
        }
    }
    if (changed) notify();
}

/**
 * `<Image imageId="…" />` ids referenced by `body` that `committedBody` (the
 * body as last committed) does not reference — i.e. the images a save has to
 * add to the commit. Pass the result (plus e.g. a new thumbnail id) to
 * {@link collectPendingImages}.
 */
export function findUncommittedImageIds(
    body: string,
    committedBody = "",
): string[] {
    const committed = new Set(extractImageComponentIds(committedBody));
    return extractImageComponentIds(body).filter((id) => !committed.has(id));
}

/**
 * Wait for the given images to finish encoding and return their blobs, ready
 * to be sent to the server and committed together with the post body.
 *
 * Throws {@link PendingImageError} when any id failed to encode or has no
 * entry in the store (the bytes only live in this tab's memory, so an image
 * inserted before a reload cannot be recovered — the user has to re-insert
 * it). Entries stay in the store; call {@link removePending} for each id once
 * the commit succeeded.
 */
export async function collectPendingImages(
    ids: Iterable<string>,
): Promise<PendingImage[]> {
    const entries: PendingEntry[] = [];
    const missingIds: string[] = [];
    for (const id of new Set(ids)) {
        const entry = store.get(id);
        if (entry) entries.push(entry);
        else missingIds.push(id);
    }
    const results = await Promise.allSettled(
        entries.map((entry) => entry.done),
    );
    const images: PendingImage[] = [];
    const failedIds: string[] = [];
    results.forEach((result, i) => {
        const imageId = (entries[i] as PendingEntry).id;
        if (result.status === "fulfilled") {
            images.push({ imageId, blob: result.value });
        } else {
            failedIds.push(imageId);
        }
    });
    if (failedIds.length > 0 || missingIds.length > 0) {
        throw new PendingImageError(
            failedIds.length > 0
                ? "Some images failed to encode. Remove or re-insert them, then save again."
                : "Some images are no longer in memory (was the page reloaded?). Re-insert them, then save again.",
            failedIds,
            missingIds,
        );
    }
    return images;
}
