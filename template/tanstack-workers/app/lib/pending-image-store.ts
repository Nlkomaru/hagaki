import { v4 as uuidv4 } from "uuid";
import type { ProcessedImage } from "./image-pipeline";

export interface PendingEntry {
    id: string;
    /** Blob URL of the original (pre-processing) file — shown to the user
     *  immediately so the editor preview is instant. */
    previewBlobUrl: string;
    /** Resolves once AVIF encode + blurhash + resize finish. */
    processing: Promise<ProcessedImage>;
    /** True once `processing` has settled (either resolved or rejected). */
    processed: boolean;
}

const PENDING_PROTOCOL = "pending:";
const store = new Map<string, PendingEntry>();
const listeners = new Set<() => void>();

function notify(): void {
    for (const fn of listeners) fn();
}

export function isPendingUrl(url: string): boolean {
    return url.startsWith(PENDING_PROTOCOL);
}

export function pendingUrlFor(id: string): string {
    return `${PENDING_PROTOCOL}${id}`;
}

export function idFromPendingUrl(url: string): string | null {
    if (!isPendingUrl(url)) return null;
    return url.slice(PENDING_PROTOCOL.length);
}

export interface AddPendingInput {
    file: File;
    processing: Promise<ProcessedImage>;
}

export function addPending(input: AddPendingInput): PendingEntry {
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

export function consumePending(id: string): void {
    const entry = store.get(id);
    if (entry) {
        URL.revokeObjectURL(entry.previewBlobUrl);
        store.delete(id);
        notify();
    }
}

export function listPending(): PendingEntry[] {
    return Array.from(store.values());
}

/** True while at least one image is still being processed (AVIF encode). */
export function hasUnprocessed(): boolean {
    for (const e of store.values()) {
        if (!e.processed) return true;
    }
    return false;
}

export function subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

export function clearAll(): void {
    for (const entry of store.values()) {
        URL.revokeObjectURL(entry.previewBlobUrl);
    }
    store.clear();
    notify();
}
