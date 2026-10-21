/**
 * `hagaki/pending-images` — in-memory store for images the user inserted into
 * the editor but has not committed yet. Nothing is uploaded while editing:
 * the encoded AVIF stays in this tab as a `Blob` and goes to the server only
 * when the post is saved, landing in the same commit as the body.
 *
 *   1. Insert: `startPending({ file })` analyzes the file (blurhash +
 *      dimensions) and resolves right away with an entry keyed by a fresh
 *      UUID, so the editor can insert `<Image imageId="…" />` and show the
 *      blurhash placeholder. The AVIF encode continues in the background;
 *      `status` moves `"encoding"` → `"ready"` | `"error"`.
 *   2. Preview: a `"ready"` entry has `previewUrl`, a `blob:` object URL —
 *      `getPending(id)?.previewUrl` is what the editor shows.
 *   3. Save: `findUncommittedImageIds(body, committedBody)` lists the ids the
 *      commit must add; `collectPendingImages(ids)` awaits their encodes and
 *      returns `{ imageId, blob }[]` (or throws `PendingImageError`). Send the
 *      blobs with the post (e.g. `FormData`) and commit them with
 *      `client.posts.save(post, { files })` / `client.commits.commitFiles`.
 *   4. After the commit succeeded: switch the editor to the committed image
 *      URLs first (update your committed body), then `removePending(id)` for
 *      each committed id — that revokes the object URL.
 *
 * `subscribe(fn)` plus `hasActive()` / `hasErrors()` drive the save button;
 * `sweepOrphanedErrors(body)` from the editor's `onChange` drops failures
 * whose `<Image />` node was deleted.
 *
 * Module state — designed for a single browser session. Not usable on the
 * server, and gone after a reload (re-insert the image in that case).
 */
export {
    clearAll,
    collectPendingImages,
    findUncommittedImageIds,
    getPending,
    hasActive,
    hasErrors,
    listPending,
    type PendingEntry,
    type PendingImage,
    PendingImageError,
    type PendingStatus,
    removePending,
    type StartPendingInput,
    startPending,
    subscribe,
    sweepOrphanedErrors,
} from "./pending-images/store.js";
