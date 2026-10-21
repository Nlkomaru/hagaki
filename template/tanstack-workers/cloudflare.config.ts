import { bindings, defineConfig } from "cf/config";

// Account comes from CLOUDFLARE_ACCOUNT_ID (`.env` locally, a GitHub secret
// in CI) — never hard-code it here. Static assets are the Vite client build;
// the Cloudflare Vite plugin wires them up, so no assets setting is needed.
export default defineConfig({
    worker: {
        name: "hagaki-template",
        compatibilityDate: "2026-10-01",
        compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
        entrypoint: "@tanstack/react-start/server-entry",
        // Served at https://hagaki-template.<subdomain>.workers.dev only.
        workersDev: true,
        previewUrls: true,
        observability: { enabled: true },
        env: {
            // Where `hagaki generate`d content is served — the content-worker
            // template deployed next to this one.
            HAGAKI_CDN_BASE_URL: bindings.text(
                "https://hagaki-content.example.workers.dev",
            ),
            HAGAKI_GITHUB_OWNER: bindings.text("Nlkomaru"),
            HAGAKI_GITHUB_REPO: bindings.text("hagaki-content"),
            // MineAuth (OIDC) public client + PKCE — no client secret. Use
            // the id of a client registered with this app's
            // `<origin>/api/auth/callback/MineAuth` redirect URI.
            CLIENT_ID: bindings.text("set-your-mineauth-client-id"),
            MAIN_SERVER_URL: bindings.text("https://api.morino.party/main"),
            // Worker secrets: `.dev.vars` locally, `cf deploy --secrets-file`
            // (or the dashboard) in production.
            HAGAKI_GITHUB_TOKEN: bindings.secret(),
            AUTH_SECRET: bindings.secret(),
        },
    },
});
