import { defineConfig } from "tsdown";

export default defineConfig([
    {
        entry: {
            index: "src/index.ts",
            react: "src/react.ts",
            editor: "src/editor.ts",
            image: "src/image.ts",
            markdown: "src/markdown.ts",
            "pending-images": "src/pending-images.ts",
            "auth/better-auth": "src/auth/better-auth.ts",
            "content-worker": "src/content-worker/index.ts",
        },
        format: "esm",
        platform: "neutral",
        target: "es2022",
        fixedExtension: false,
        dts: true,
        sourcemap: true,
        clean: true,
        // Entries share chunks (e.g. the HagakiImageConfig context used by
        // both `react` and `editor`); a duplicated context would break
        // provider lookups across the two bundles.
        //
        // Everything in dependencies / peerDependencies is external by
        // default. `lexical` is listed explicitly: it must resolve to the
        // consumer's copy (the one `@mdxeditor/editor` uses), never a bundled
        // second instance. `@jsquash/avif` stays external so its WASM is
        // fetched relative to the consumer's node_modules.
        deps: { neverBundle: ["lexical", /^@jsquash\/avif/] },
        // The editor sources carry "use client" for readers; bundling drops
        // it (consumers import the editor from their own client components).
        checks: { moduleLevelDirective: false },
    },
    {
        // The CLI is Node-only (fs, child_process for git history) and keeps
        // its shebang; `clean: false` so it doesn't wipe the first build.
        entry: { cli: "src/cli/index.ts" },
        format: "esm",
        platform: "node",
        fixedExtension: false,
        dts: false,
        clean: false,
        banner: { js: "#!/usr/bin/env node" },
    },
]);
