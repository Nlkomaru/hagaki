import { Hono } from 'hono';

// src/content-worker/index.ts
var PUBLISHED_TTL_MS = 6e4;
var publishedCache = null;
async function publishedUuids(assets, requestUrl) {
  const now = Date.now();
  if (publishedCache && now - publishedCache.fetchedAt < PUBLISHED_TTL_MS) {
    return publishedCache.uuids;
  }
  try {
    const url = new URL("/slug-index.json", requestUrl);
    const res = await assets.fetch(new Request(url));
    if (!res.ok) return null;
    const index = await res.json();
    const uuids = new Set(Object.values(index));
    publishedCache = { uuids, fetchedAt: now };
    return uuids;
  } catch {
    return null;
  }
}
function createContentApp() {
  const app = new Hono();
  const serveArticle = async (c) => {
    const uuid = c.req.param("uuid");
    const published = await publishedUuids(c.env.ASSETS, c.req.url);
    if (!published?.has(uuid)) return c.notFound();
    return c.env.ASSETS.fetch(c.req.raw);
  };
  app.get("/article/:uuid", serveArticle);
  app.get("/article/:uuid/*", serveArticle);
  app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));
  return app;
}

export { createContentApp };
//# sourceMappingURL=content-worker.js.map
//# sourceMappingURL=content-worker.js.map