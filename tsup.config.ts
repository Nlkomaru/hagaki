import { defineConfig } from "tsup";

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
        format: ["esm"],
        dts: true,
        sourcemap: true,
        clean: true,
        target: "es2022",
        platform: "neutral",
        // Code splitting keeps modules shared between entries (e.g. the
        // HagakiImageConfig context used by both `react` and `editor`) as a
        // single chunk — duplicating the context would break provider lookups
        // across the two bundles.
        splitting: true,
        treeshake: true,
        external: [
            "react",
            "react-dom",
            "@mdxeditor/editor",
            // @mdxeditor/gurx and lexical must share the same instance as the
            // consumer's @mdxeditor/editor — bundling them produces a second
            // RealmContext and breaks `useRealm`/hook lookups.
            "@mdxeditor/gurx",
            "lexical",
            "octokit",
            "gray-matter",
            "hono",
            // Image / markdown / pending-images deps — declared in package.json
            // dependencies so consumers resolve them at runtime instead of us
            // shipping duplicates. `@jsquash/avif` is especially important to
            // keep external so its WASM is fetched relative to the consumer's
            // own node_modules layout.
            "@jsquash/avif",
            "@jsquash/avif/encode",
            "blurhash",
            "uuid",
            "unified",
            "remark-parse",
            "remark-mdx",
        ],
    },
    {
        // The CLI is Node-only (fs, child_process for git history) and gets a
        // shebang; `clean: false` so it doesn't wipe the first config's output.
        entry: { cli: "src/cli/index.ts" },
        format: ["esm"],
        dts: false,
        sourcemap: false,
        clean: false,
        target: "es2022",
        platform: "node",
        banner: { js: "#!/usr/bin/env node" },
        external: ["gray-matter"],
    },
]);
