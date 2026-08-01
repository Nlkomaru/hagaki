/**
 * `hagaki/pending-images` — session-local store for images the user has
 * inserted into the editor but not yet committed to the repo.
 *
 *   - `addPending({ file, processing })` registers a new placeholder, keyed
 *     by a UUID. The returned entry's `id` becomes part of a `pending:<id>`
 *     URL the editor displays until save time.
 *   - `getPending(id)` looks up the entry — used by the save flow to await
 *     the `processing` promise (AVIF encode + blurhash) before commit.
 *   - `subscribe(fn)` / `hasUnprocessed()` let the UI disable the save
 *     button until every encode has settled.
 *
 * Module state — designed for a single browser session. Not safe to use on
 * the server.
 */
export {
    type AddPendingInput,
    addPending,
    clearAll,
    getPending,
    hasUnprocessed,
    idFromPendingUrl,
    type PendingEntry,
    pendingUrlFor,
    subscribe,
} from "./pending-images/store.js";
