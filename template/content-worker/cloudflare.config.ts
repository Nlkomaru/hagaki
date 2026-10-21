import { bindings, defineConfig } from "cf/config";

// Account comes from CLOUDFLARE_ACCOUNT_ID (`.env` locally, a GitHub secret
// in CI) — never hard-code it here.
export default defineConfig({
    worker: {
        name: "hagaki-content",
        compatibilityDate: "2026-10-01",
        entrypoint: "src/index.ts",
        // Served at https://hagaki-content.<subdomain>.workers.dev only.
        workersDev: true,
        assets: {
            // Only article files need the worker (draft gating); manifests
            // and categories stay asset-first.
            runWorkerFirst: ["/article/*"],
        },
        env: {
            ASSETS: bindings.assets(),
        },
    },
});
