/**
 * `hagaki/pending-images` — session-local store for images the user has
 * inserted into the editor but not yet committed to the repo.
 *
 *   - `startPending({ file, upload })` analyzes the file (blurhash +
 *     dimensions) and resolves immediately with an entry keyed by a UUID —
 *     the editor inserts an `::img{id="…"}` directive right away and shows
 *     the blurhash placeholder. AVIF encode and the upload to temporary
 *     storage continue in the background; `status` moves through
 *     "encoding" → "uploading" → "uploaded" | "error".
 *   - `getPending(id)` looks up an entry — the save flow awaits `done` for
 *     every id still referenced by the body before committing.
 *   - `subscribe(fn)` plus `hasActive()` / `hasErrors()` let the UI disable
 *     the save button while uploads run or have failed.
 *   - `removePending(id)` drops one entry (image deleted in the editor);
 *     `clearAll()` resets the store after a successful commit.
 *
 * Module state — designed for a single browser session. Not safe to use on
 * the server.
 */
export {
    clearAll,
    getPending,
    hasActive,
    hasErrors,
    idFromPendingUrl,
    listPending,
    type PendingEntry,
    type PendingStatus,
    pendingUrlFor,
    removePending,
    type StartPendingInput,
    startPending,
    subscribe,
} from "./pending-images/store.js";
