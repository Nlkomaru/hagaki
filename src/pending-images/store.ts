import { v4 as uuidv4 } from "uuid";
import type { ProcessedImage } from "../image/pipeline.js";

export interface PendingEntry {
    id: string;
    /**
     * Blob URL of the original (pre-processing) file — shown to the user
     * immediately so the editor preview is instant.
     */
    previewBlobUrl: string;
    /** Resolves once AVIF encode + blurhash + resize finish. */
    processing: Promise<ProcessedImage>;
    /** True once `processing` has settled (resolved or rejected). */
    processed: boolean;
}

const PENDING_PROTOCOL = "pending:";
const store = new Map<string, PendingEntry>();
const listeners = new Set<() => void>();

/**
 * This store is browser-only: it holds module-global state and depends on
 * `URL.createObjectURL`. Importing it from a server bundle is fine (pure
 * functions like {@link pendingUrlFor} still work), but the blob-backed
 * operations must fail loudly rather than crash with a cryptic
 * `URL.createObjectURL is not a function`.
 */
function assertBrowser(api: string): void {
    if (typeof URL === "undefined" || !("createObjectURL" in URL)) {
        throw new Error(
            `hagaki/pending-images: ${api}() is browser-only and was called in a non-browser environment`,
        );
    }
}

function notify(): void {
    for (const fn of listeners) fn();
}

// Markdown serializers (e.g. MDXEditor) often escape the scheme colon, so a
// `pending:<id>` URL can come back as `pending\:<id>`. Accept either form
// everywhere — otherwise the save path silently fails to resolve the upload
// and commits a dead reference.
const PENDING_URL_RE = /^pending\\?:(.+)$/s;

export function pendingUrlFor(id: string): string {
    return `${PENDING_PROTOCOL}${id}`;
}

export function idFromPendingUrl(url: string): string | null {
    const match = PENDING_URL_RE.exec(url);
    return match ? (match[1] ?? null) : null;
}

export interface AddPendingInput {
    file: File;
    processing: Promise<ProcessedImage>;
}

export function addPending(input: AddPendingInput): PendingEntry {
    assertBrowser("addPending");
    const id = uuidv4();
    const previewBlobUrl = URL.createObjectURL(input.file);
    const entry: PendingEntry = {
        id,
        previewBlobUrl,
        processing: input.processing,
        processed: false,
    };
    store.set(id, entry);
    notify();
    input.processing.finally(() => {
        entry.processed = true;
        notify();
    });
    return entry;
}

export function getPending(id: string): PendingEntry | undefined {
    return store.get(id);
}

/** True while at least one image is still being processed (AVIF encode). */
export function hasUnprocessed(): boolean {
    return Array.from(store.values()).some((entry) => !entry.processed);
}

export function subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

export function clearAll(): void {
    assertBrowser("clearAll");
    for (const entry of store.values()) {
        URL.revokeObjectURL(entry.previewBlobUrl);
    }
    store.clear();
    notify();
}
