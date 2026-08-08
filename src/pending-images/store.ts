import { v4 as uuidv4 } from "uuid";
import {
    analyzeImage,
    encodeAnalyzedImage,
    type ProcessImageOptions,
} from "../image/pipeline.js";

export type PendingStatus = "encoding" | "uploading" | "uploaded" | "error";

export interface PendingEntry {
    /** uuidv4 — doubles as the image id and file name (`<id>.avif`). */
    id: string;
    blurhash: string;
    width: number;
    height: number;
    status: PendingStatus;
    /** Cause of failure when `status === "error"`. */
    error?: unknown;
    /** Temporary Workers preview URL, set once `status === "uploaded"`. */
    previewUrl?: string;
    /** Resolves when encode + upload finish, rejects on failure. */
    done: Promise<void>;
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

// Markdown serializers (e.g. MDXEditor) often escape the scheme colon, so a
// `pending:<id>` URL can come back as `pending\:<id>`. Accept either form.
const PENDING_URL_RE = /^pending\\?:(.+)$/s;

/**
 * @deprecated Legacy `pending:<id>` URL scheme from the pre-directive image
 * flow. Kept only so old drafts can be detected and cleaned up.
 */
export function pendingUrlFor(id: string): string {
    return `pending:${id}`;
}

/**
 * @deprecated Legacy `pending:<id>` URL scheme from the pre-directive image
 * flow. Kept only so old drafts can be detected and cleaned up.
 */
export function idFromPendingUrl(url: string): string | null {
    const match = PENDING_URL_RE.exec(url);
    return match ? (match[1] ?? null) : null;
}

export interface StartPendingInput {
    file: File;
    /** Sends the encoded AVIF to temporary storage; returns a preview URL. */
    upload: (input: { id: string; avif: Uint8Array }) => Promise<string>;
    processOptions?: ProcessImageOptions;
}

/**
 * Resolves as soon as `analyzeImage` finishes (= blurhash known) and returns
 * the entry. Encode → upload continue in the background; `status` moves
 * through "encoding" → "uploading" → "uploaded" | "error", notifying
 * subscribers on every transition. `entry.done` tracks the background work;
 * an internal `.catch(() => {})` prevents unhandled rejections when nobody
 * awaits it.
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
        done: undefined as unknown as Promise<void>,
    };
    entry.done = (async () => {
        try {
            const avif = await encodeAnalyzedImage(
                analyzed,
                input.processOptions,
            );
            entry.status = "uploading";
            notify();
            const previewUrl = await input.upload({ id, avif });
            entry.status = "uploaded";
            entry.previewUrl = previewUrl;
            notify();
        } catch (e) {
            entry.status = "error";
            entry.error = e;
            notify();
            throw e;
        }
    })();
    // Callers may never await `done`; keep its rejection observed.
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

/** Drop a single entry, e.g. after the image was removed from the editor. */
export function removePending(id: string): void {
    if (store.delete(id)) notify();
}

/**
 * True while at least one entry is still encoding or uploading — used to
 * disable the save button.
 */
export function hasActive(): boolean {
    return Array.from(store.values()).some(
        (entry) => entry.status === "encoding" || entry.status === "uploading",
    );
}

/** True if any entry ended in `status === "error"`. */
export function hasErrors(): boolean {
    return Array.from(store.values()).some((entry) => entry.status === "error");
}

export function subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

export function clearAll(): void {
    store.clear();
    notify();
}
