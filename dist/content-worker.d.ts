import { Hono } from 'hono';

/**
 * The Workers Assets binding — structurally typed so consumers don't need
 * `@cloudflare/workers-types` to build.
 */
interface AssetsFetcher {
    fetch(request: Request): Promise<Response>;
}
interface ContentWorkerEnv {
    ASSETS: AssetsFetcher;
}
/**
 * Content-serving worker for a hagaki content repository, meant to sit in
 * front of a Workers Assets deployment of the `content/` directory with
 * `run_worker_first` covering `/article/*`:
 *
 * ```jsonc
 * // wrangler.jsonc
 * "main": "src/index.ts",
 * "assets": {
 *     "directory": "./content",
 *     "binding": "ASSETS",
 *     "run_worker_first": ["/article/*"]
 * }
 * ```
 *
 * Requests for a draft article's files (`article/<uuid>/index.mdx`,
 * `info.json`, `assets/*`) return 404; everything else passes through to the
 * static assets. Draft articles are only reachable through the repository.
 */
declare function createContentApp(): Hono<{
    Bindings: ContentWorkerEnv;
}>;

export { type AssetsFetcher, type ContentWorkerEnv, createContentApp };
