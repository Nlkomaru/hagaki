# hagaki

GitHub をストレージとして使う、headless なマークダウンエディタ + コンテンツ API ライブラリ。

- **コア API** — Octokit ベースの GitHub 読み書き、CDN コンテンツ取得、コミット情報取得を一つの client にまとめる。Next.js / 認証フレームワーク非依存。
- **エディタ** — `@mdxeditor/editor` を薄くラップした headless な React コンポーネント。スタイルは持ち込まず、`className` で完全制御。
- **認証アダプタ** — better-auth など任意のセッションから `Committer` を生成する小さなヘルパ。

## Install

```sh
pnpm add hagaki
# React のエディタを使う場合
pnpm add @mdxeditor/editor react react-dom
```

## Quick start

### 1. Client を作る

```ts
import { createHagakiClient } from "hagaki";

const hagaki = createHagakiClient({
  github: {
    owner: "morinoparty",
    repo: "wiki-contentdev",
    branch: "main",
    contentPath: "content/article", // 各記事は content/article/<uuid>/index.mdx
    auth: process.env.GITHUB_TOKEN!, // string でも () => Promise<string> でも可
  },
  content: {
    cdnBaseUrl: "https://content.wiki.morino.party",
  },
});

const posts = await hagaki.posts.list({ sortBy: "created", order: "desc" });
const post = await hagaki.posts.getBySlug("hello-world");
```

### 2. 記事を保存する

```ts
import { committerFromBetterAuth } from "hagaki/auth/better-auth";

const session = await auth(); // better-auth の session
const committer = committerFromBetterAuth(session, {
  defaultEmail: "uuid+player@morino.party",
});

const result = await hagaki.posts.save(post, {
  committer,
  commitMessage: "📝 Update post: hello-world",
});
console.log(result.commitSha, result.commitUrl);
```

### 3. エディタを使う

```tsx
"use client";
import { HagakiEditor, defaultPlugins } from "hagaki/react";
import "@mdxeditor/editor/style.css";

export function MyEditor({ markdown, onChange }: { markdown: string; onChange: (m: string) => void }) {
  return (
    <HagakiEditor
      markdown={markdown}
      onChange={onChange}
      plugins={defaultPlugins({
        imageUploadHandler: async (file) => upload(file),
        imagePreviewHandler: async (src) => `https://cdn.example.com/${src}`,
      })}
      contentEditableClassName="my-prose"
    />
  );
}
```

Next.js では `dynamic(() => import("./MyEditor"), { ssr: false })` で読み込むこと（MDXEditor は client only）。

## Markdown 機能

`defaultPlugins()` で有効になっているもの / 未対応のものの一覧。

### コア記法

- [x] 見出し（`headingsPlugin`）
- [x] 太字 / 斜体 / 下線（`BoldItalicUnderlineToggles`）
- [x] 順序付き / 順序なしリスト（`listsPlugin`）
- [x] タスクリスト（チェックボックス、`listsPlugin` 内）
- [x] 引用（`quotePlugin`）
- [x] 水平線（`thematicBreakPlugin`）
- [x] リンク（`linkPlugin`）
- [x] テーブル（`tablePlugin`）
- [x] コードブロック（`codeBlockPlugin`、プレーン）
- [x] Admonition（`directivesPlugin` + `AdmonitionDirectiveDescriptor`）
- [x] Markdown ショートカット（`markdownShortcutPlugin`）
- [x] アンドゥ / リドゥ（`UndoRedo`）

### 画像

- [x] 画像挿入（`imagePlugin` — `imageUploadHandler` / `imagePreviewHandler` を渡したときだけ有効）
- [x] ドラッグ&ドロップ / クリップボード貼り付けでのアップロード（`imagePlugin` 標準）
- [ ] GitHub への画像アップロード組み込みヘルパ（現状は呼び出し側で `imageUploadHandler` を実装する必要あり）
- [ ] `InsertImage` ツールバーボタンの再エクスポート（現状は `@mdxeditor/editor` から直接 import する必要あり）

### ツールバー

- [x] `toolbarPlugin`（`toolbarContents` を渡したときだけ有効）
- [x] 再エクスポート: `BlockTypeSelect` / `BoldItalicUnderlineToggles` / `UndoRedo`
- [ ] 再エクスポート: `CreateLink` / `InsertImage` / `InsertTable` / `InsertThematicBreak` / `InsertCodeBlock` / `InsertAdmonition` / `ListsToggle` / `CodeToggle` 等
- [ ] そのまま使える「全部入り」デフォルトツールバー（`defaultToolbarContents` は最小構成のみ）

### 未対応の MDXEditor プラグイン

- [ ] `codeMirrorPlugin`（コードブロックのシンタックスハイライト / 言語選択）
- [ ] `frontmatterPlugin`（エディタ上での frontmatter 編集 UI）
- [ ] `diffSourcePlugin`（リッチ / ソース / Diff の切替ビュー）
- [ ] `linkDialogPlugin`（リンク編集ダイアログ）
- [ ] `sandpackPlugin`（ライブコード）
- [ ] `jsxPlugin`（MDX の JSX 埋め込み）

## Entry points

| import path | 内容 |
|---|---|
| `hagaki`                  | `createHagakiClient`, 型, `toUrlSlug` ほか |
| `hagaki/react`            | `HagakiEditor`, `defaultPlugins` |
| `hagaki/auth/better-auth` | `committerFromBetterAuth` |

## License

MIT
