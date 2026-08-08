import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        index: "src/index.ts",
        react: "src/react.ts",
        image: "src/image.ts",
        markdown: "src/markdown.ts",
        "pending-images": "src/pending-images.ts",
        auth: "src/auth/index.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    platform: "neutral",
    splitting: false,
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
        "remark-gfm",
        "remark-rehype",
        "rehype-stringify",
    ],
});
