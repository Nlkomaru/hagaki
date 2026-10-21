import { n as extractImageComponentIds } from "./image-jsx-BUhLvWgR.js";
import { i as encodeAnalyzedImage, r as analyzeImage } from "./pipeline-G2BMjcPR.js";
import { v4 } from "uuid";
//#region src/pending-images/store.ts
/**
* Thrown by {@link collectPendingImages} when an image cannot be committed:
* its encode failed (`failedIds`) or the store has no entry for it
* (`missingIds` — typically after a page reload, since the bytes only ever
* lived in this tab's memory).
*/
var PendingImageError = class extends Error {
	failedIds;
	missingIds;
	constructor(message, failedIds, missingIds) {
		super(message);
		this.failedIds = failedIds;
		this.missingIds = missingIds;
		this.name = "PendingImageError";
	}
};
const store = /* @__PURE__ */ new Map();
const listeners = /* @__PURE__ */ new Set();
/**
* This store is browser-only: it holds module-global state and
* `startPending` drives the canvas/WASM image pipeline. Importing it from a
* server bundle is fine (pure lookups still work), but the browser-backed
* operations must fail loudly rather than crash with a cryptic canvas error.
*/
function assertBrowser(api) {
	if (typeof document === "undefined") throw new Error(`hagaki/pending-images: ${api}() is browser-only and was called in a non-browser environment`);
}
function notify() {
	for (const fn of listeners) fn();
}
function release(entry) {
	if (entry.previewUrl) {
		URL.revokeObjectURL(entry.previewUrl);
		entry.previewUrl = void 0;
	}
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
async function startPending(input) {
	assertBrowser("startPending");
	const id = v4();
	const analyzed = await analyzeImage(input.file, input.processOptions);
	const entry = {
		id,
		blurhash: analyzed.blurhash,
		width: analyzed.width,
		height: analyzed.height,
		status: "encoding",
		done: void 0
	};
	entry.done = (async () => {
		try {
			const avif = await encodeAnalyzedImage(analyzed, input.processOptions);
			const blob = new Blob([avif], { type: "image/avif" });
			entry.blob = blob;
			entry.status = "ready";
			if (store.get(id) === entry) entry.previewUrl = URL.createObjectURL(blob);
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
function getPending(id) {
	return store.get(id);
}
/** Snapshot of every entry, in insertion order. */
function listPending() {
	return [...store.values()];
}
/**
* Drop one entry and revoke its preview URL — after the image was removed
* from the editor, or once a commit containing it succeeded.
*/
function removePending(id) {
	const entry = store.get(id);
	if (!entry) return;
	store.delete(id);
	release(entry);
	notify();
}
/** Drop every entry and revoke every preview URL. */
function clearAll() {
	for (const entry of store.values()) release(entry);
	store.clear();
	notify();
}
/**
* True while at least one entry is still encoding — used to disable the
* save button.
*/
function hasActive() {
	for (const entry of store.values()) if (entry.status === "encoding") return true;
	return false;
}
/** True if any entry ended in `status === "error"`. */
function hasErrors() {
	for (const entry of store.values()) if (entry.status === "error") return true;
	return false;
}
function subscribe(fn) {
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
function sweepOrphanedErrors(body) {
	let changed = false;
	for (const entry of [...store.values()]) if (entry.status === "error" && !body.includes(entry.id)) {
		store.delete(entry.id);
		release(entry);
		changed = true;
	}
	if (changed) notify();
}
/**
* `<Image imageId="…" />` ids referenced by `body` that `committedBody` (the
* body as last committed) does not reference — i.e. the images a save has to
* add to the commit. Pass the result (plus e.g. a new thumbnail id) to
* {@link collectPendingImages}.
*/
function findUncommittedImageIds(body, committedBody = "") {
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
async function collectPendingImages(ids) {
	const entries = [];
	const missingIds = [];
	for (const id of new Set(ids)) {
		const entry = store.get(id);
		if (entry) entries.push(entry);
		else missingIds.push(id);
	}
	const results = await Promise.allSettled(entries.map((entry) => entry.done));
	const images = [];
	const failedIds = [];
	results.forEach((result, i) => {
		const imageId = entries[i].id;
		if (result.status === "fulfilled") images.push({
			imageId,
			blob: result.value
		});
		else failedIds.push(imageId);
	});
	if (failedIds.length > 0 || missingIds.length > 0) throw new PendingImageError(failedIds.length > 0 ? "Some images failed to encode. Remove or re-insert them, then save again." : "Some images are no longer in memory (was the page reloaded?). Re-insert them, then save again.", failedIds, missingIds);
	return images;
}
//#endregion
export { getPending as a, listPending as c, subscribe as d, sweepOrphanedErrors as f, findUncommittedImageIds as i, removePending as l, clearAll as n, hasActive as o, collectPendingImages as r, hasErrors as s, PendingImageError as t, startPending as u };

//# sourceMappingURL=store-CEqpYuPk.js.map