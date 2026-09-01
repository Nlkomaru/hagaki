import { P as ProcessImageOptions } from './pipeline-6kF6pdR8.js';

type PendingStatus = "encoding" | "uploading" | "uploaded" | "error";
interface PendingEntry {
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
/**
 * @deprecated Legacy `pending:<id>` URL scheme from the pre-directive image
 * flow. Kept only so old drafts can be detected and cleaned up.
 */
declare function pendingUrlFor(id: string): string;
/**
 * @deprecated Legacy `pending:<id>` URL scheme from the pre-directive image
 * flow. Kept only so old drafts can be detected and cleaned up.
 */
declare function idFromPendingUrl(url: string): string | null;
interface StartPendingInput {
    file: File;
    /** Sends the encoded AVIF to temporary storage; returns a preview URL. */
    upload: (input: {
        id: string;
        avif: Uint8Array;
    }) => Promise<string>;
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
declare function startPending(input: StartPendingInput): Promise<PendingEntry>;
declare function getPending(id: string): PendingEntry | undefined;
/** Snapshot of every entry, in insertion order. */
declare function listPending(): PendingEntry[];
/** Drop a single entry, e.g. after the image was removed from the editor. */
declare function removePending(id: string): void;
/**
 * True while at least one entry is still encoding or uploading — used to
 * disable the save button.
 */
declare function hasActive(): boolean;
/** True if any entry ended in `status === "error"`. */
declare function hasErrors(): boolean;
declare function subscribe(fn: () => void): () => void;
declare function clearAll(): void;

export { type PendingEntry, type PendingStatus, type StartPendingInput, clearAll, getPending, hasActive, hasErrors, idFromPendingUrl, listPending, pendingUrlFor, removePending, startPending, subscribe };
