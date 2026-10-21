import { defineWranglerConfig } from "wrangler/experimental-config";

// Build settings for the Wrangler bundler that `cf build` / `cf dev` drive.
// The Worker itself is described in `cloudflare.config.ts`.
export default defineWranglerConfig({
    // Runs before every `cf dev` / `cf build`: writes the manifests
    // (article.json, slug-index.json, categories.json, article/<uuid>/info.json)
    // into ./content. info.json history comes from `git log`, so CI needs a
    // full-history clone.
    build: {
        command: "node_modules/.bin/hagaki generate",
    },
    // The whole directory is served as static assets.
    assetsDirectory: "./content",
});
