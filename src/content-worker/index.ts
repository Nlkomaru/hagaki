import { type Context, Hono } from "hono";

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

/** How long a fetched publish allow-list stays valid, per isolate. */
const PUBLISHED_TTL_MS = 60_000;

let publishedCache: { uuids: Set<string>; fetchedAt: number } | null = null;

/**
 * The set of published article uuids = the values of the generated
 * `slug-index.json` (drafts never get a slug-index entry). Read through the
 * ASSETS binding so the worker sees exactly the deployed generation.
 *
 * Fail-closed: when the index can't be read, nothing under `article/` is
 * served — a missing generate step must not expose drafts.
 */
async function publishedUuids(
    assets: AssetsFetcher,
    requestUrl: string,
): Promise<Set<string> | null> {
    const now = Date.now();
    if (publishedCache && now - publishedCache.fetchedAt < PUBLISHED_TTL_MS) {
        return publishedCache.uuids;
    }
    try {
        const url = new URL("/slug-index.json", requestUrl);
        const res = await assets.fetch(new Request(url));
        if (!res.ok) return null;
        const index = (await res.json()) as Record<string, string>;
        const uuids = new Set(Object.values(index));
        publishedCache = { uuids, fetchedAt: now };
        return uuids;
    } catch {
        return null;
    }
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
export function createContentApp(): Hono<{ Bindings: ContentWorkerEnv }> {
    const app = new Hono<{ Bindings: ContentWorkerEnv }>();

    const serveArticle = async (
        c: Context<{ Bindings: ContentWorkerEnv }, "/article/:uuid">,
    ) => {
        const uuid = c.req.param("uuid");
        const published = await publishedUuids(c.env.ASSETS, c.req.url);
        if (!published?.has(uuid)) return c.notFound();
        return c.env.ASSETS.fetch(c.req.raw);
    };

    app.get("/article/:uuid", serveArticle);
    app.get("/article/:uuid/*", serveArticle);
    // run_worker_first should only route /article/* here, but stay
    // transparent for anything else that reaches the worker.
    app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

    return app;
}
