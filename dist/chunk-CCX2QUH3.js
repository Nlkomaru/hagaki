import { analyzeImage, encodeAnalyzedImage } from './chunk-LSPG3ZGH.js';
import { v4 } from 'uuid';

var store = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
function assertBrowser(api) {
  if (typeof document === "undefined") {
    throw new Error(
      `hagaki/pending-images: ${api}() is browser-only and was called in a non-browser environment`
    );
  }
}
function notify() {
  for (const fn of listeners) fn();
}
var PENDING_URL_RE = /^pending\\?:(.+)$/s;
function pendingUrlFor(id) {
  return `pending:${id}`;
}
function idFromPendingUrl(url) {
  const match = PENDING_URL_RE.exec(url);
  return match ? match[1] ?? null : null;
}
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
    // Assigned right below — the background chain needs `entry` in scope.
    done: void 0
  };
  entry.done = (async () => {
    try {
      const avif = await encodeAnalyzedImage(
        analyzed,
        input.processOptions
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
  entry.done.catch(() => {
  });
  store.set(id, entry);
  notify();
  return entry;
}
function getPending(id) {
  return store.get(id);
}
function listPending() {
  return [...store.values()];
}
function removePending(id) {
  if (store.delete(id)) notify();
}
function hasActive() {
  return Array.from(store.values()).some(
    (entry) => entry.status === "encoding" || entry.status === "uploading"
  );
}
function hasErrors() {
  return Array.from(store.values()).some((entry) => entry.status === "error");
}
function subscribe(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function clearAll() {
  store.clear();
  notify();
}

export { clearAll, getPending, hasActive, hasErrors, idFromPendingUrl, listPending, pendingUrlFor, removePending, startPending, subscribe };
//# sourceMappingURL=chunk-CCX2QUH3.js.map
//# sourceMappingURL=chunk-CCX2QUH3.js.map