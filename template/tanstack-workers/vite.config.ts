import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const fsStub = fileURLToPath(
    new URL("./app/lib/node-fs-stub.ts", import.meta.url),
);

export default defineConfig({
    plugins: [
        cloudflare({ viteEnvironment: { name: "ssr" } }),
        tailwindcss(),
        tanstackStart({
            srcDirectory: "app",
        }),
        tsconfigPaths(),
        viteReact(),
    ],
    server: {
        port: 3000,
    },
    // @jsquash/avif ships a worker that uses dynamic imports for
    // multi-threaded encoding; vite's worker bundler defaults to IIFE which
    // doesn't support code-splitting, so switch the worker output to ESM.
    worker: {
        format: "es",
    },
    // Cloudflare Workers (nodejs_compat_v2) does not provide `node:fs`.
    // gray-matter (used transitively via hagaki) imports it eagerly but only
    // calls into it in `matter.read(filepath)`, which we never use. Aliasing
    // to a stub keeps the worker bundle resolvable.
    resolve: {
        alias: [
            { find: /^node:fs$/, replacement: fsStub },
            { find: /^node:fs\/promises$/, replacement: fsStub },
            { find: /^fs$/, replacement: fsStub },
            { find: /^fs\/promises$/, replacement: fsStub },
        ],
    },
    // @jsquash/avif ships WASM that vite's dep optimizer can't relocate
    // (results in 404 for `avif_enc.wasm`). Skip pre-bundling so the lib
    // resolves the wasm relative to its own package URL.
    optimizeDeps: {
        exclude: ["@jsquash/avif"],
    },
});
