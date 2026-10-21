import { i as ProcessImageOptions } from "./pipeline-BsBTLj-D.js";
//#region src/pending-images/store.d.ts
/**
 * - `"encoding"` — blurhash and dimensions are known, the AVIF encode is
 *   still running.
 * - `"ready"` — `blob` and `previewUrl` are set; the image can be committed.
 * - `"error"` — the encode failed (`error` holds the cause).
 */
type PendingStatus = "encoding" | "ready" | "error";
interface PendingEntry {
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
interface PendingImage {
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
export declare class PendingImageError extends Error {
  readonly failedIds: string[];
  readonly missingIds: string[];
  constructor(message: string, failedIds: string[], missingIds: string[]);
}
interface StartPendingInput {
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
export declare function startPending(input: StartPendingInput): Promise<PendingEntry>;
export declare function getPending(id: string): PendingEntry | undefined;
/** Snapshot of every entry, in insertion order. */
export declare function listPending(): PendingEntry[];
/**
 * Drop one entry and revoke its preview URL — after the image was removed
 * from the editor, or once a commit containing it succeeded.
 */
export declare function removePending(id: string): void;
/** Drop every entry and revoke every preview URL. */
export declare function clearAll(): void;
/**
 * True while at least one entry is still encoding — used to disable the
 * save button.
 */
export declare function hasActive(): boolean;
/** True if any entry ended in `status === "error"`. */
export declare function hasErrors(): boolean;
export declare function subscribe(fn: () => void): () => void;
/**
 * Drop `"error"` entries whose id no longer appears in `body`. Deleting an
 * `<Image />` node with Backspace or undo never calls {@link removePending},
 * so without this a failed image would keep {@link hasErrors} true forever.
 * Cheap enough to call from every editor `onChange` (substring match, no
 * parse). Only failed entries are dropped: an undo can bring a node back, and
 * its encoding / ready entry must still be there when it does.
 */
export declare function sweepOrphanedErrors(body: string): void;
/**
 * `<Image imageId="…" />` ids referenced by `body` that `committedBody` (the
 * body as last committed) does not reference — i.e. the images a save has to
 * add to the commit. Pass the result (plus e.g. a new thumbnail id) to
 * {@link collectPendingImages}.
 */
export declare function findUncommittedImageIds(body: string, committedBody?: string): string[];
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
export declare function collectPendingImages(ids: Iterable<string>): Promise<PendingImage[]>;
//#endregion
export type { PendingEntry, PendingImage, PendingStatus, StartPendingInput };
//# sourceMappingURL=pending-images.d.ts.map