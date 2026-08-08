/**
 * `hagaki/editor` — the client-only markdown editor (MDXEditor-based).
 *
 * Split from `hagaki/react` so SSR routes can use `<Image>` without pulling
 * `@mdxeditor/editor` into their bundle. Load this entry lazily
 * (`lazy(() => import(...))` / `dynamic(..., { ssr: false })`).
 */
export * from "./editor/index.js";
