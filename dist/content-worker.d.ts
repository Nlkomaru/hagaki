import { Hono } from "hono";
//#region src/content-worker/index.d.ts
/**
 * The Workers Assets binding — structurally typed so consumers don't need
 * `@cloudflare/workers-types` to build.
 */
export interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}
export interface ContentWorkerEnv {
  ASSETS: AssetsFetcher;
}
/**
 * Content-serving worker for a hagaki content repository, meant to sit in
 * front of a Workers Static Assets deployment of the `content/` directory
 * with `runWorkerFirst` covering `/article/*`:
 *
 * ```ts
 * // cloudflare.config.ts (+ `assetsDirectory: "./content"` in
 * // wrangler.config.ts)
 * worker: {
 *     entrypoint: "src/index.ts",
 *     assets: { runWorkerFirst: ["/article/*"] },
 *     env: { ASSETS: bindings.assets() },
 * }
 * ```
 *
 * Requests for a draft article's files (`article/<uuid>/index.mdx`,
 * `info.json`, `assets/*`) return 404; everything else passes through to the
 * static assets. Draft articles are only reachable through the repository.
 */
export declare function createContentApp(): Hono<{
  Bindings: ContentWorkerEnv;
}>;
//#endregion
//# sourceMappingURL=content-worker.d.ts.map