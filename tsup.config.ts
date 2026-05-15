import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        index: "src/index.ts",
        react: "src/react.ts",
        "auth/better-auth": "src/auth/better-auth.ts",
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
    ],
});
