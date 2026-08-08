# hagaki

GitHub をストレージとして使う、headless なマークダウンエディタ + コンテンツ API ライブラリ。

- **コア API** (`hagaki`) — Octokit ベースの GitHub 読み書きと CDN 経由のコンテンツ取得を一つの `HagakiClient` にまとめる。Next.js / 認証フレームワーク非依存。
- **エディタ** (`hagaki/react`) — `@mdxeditor/editor` を薄くラップした headless な React コンポーネント。スタイルは持ち込まず、`className` で完全制御。
- **認証アダプタ** (`hagaki/auth`) — better-auth など任意のセッションから `Committer` を生成する小さなヘルパ。
- **画像パイプライン** (`hagaki/image`)・**pending 画像ストア** (`hagaki/pending-images`)・**markdown レンダラ** (`hagaki/markdown`) — エディタが使う画像アップロード〜表示のフルフロー。

後方互換は目的としていない。破壊的変更は都度メジャーではなくこの README を正とする。

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
    auth: process.env.GITHUB_TOKEN!, // string でも () => Promise<string> でも可
  },
  content: {
    cdnBaseUrl: "https://content.wiki.morino.party",
  },
});
```

`github.auth` が `string` のときは初回生成した Octokit インスタンスを client の寿命いっぱいキャッシュする。関数を渡した場合はトークンがローテーションする前提で、呼び出しのたびに再解決する（キャッシュしない）。

記事のディレクトリレイアウト（`content/article/<uuid>/index.md` とその `assets/`）はライブラリが一元管理しており、呼び出し側が指定する余地はない。カスタマイズできるのは読み取り側の URL 組み立てだけ:

```ts
content: {
  cdnBaseUrl: "https://content.wiki.morino.party",
  paths: {
    posts: "/article.json",       // 省略時のデフォルト
    categories: "/categories.json", // 省略時のデフォルト
    postByUuid: (uuid) => `/article/${uuid}/index.md`, // 省略時のデフォルト相当
  },
}
```

`content` を省略した client は書き込み専用として使える（`posts.list` / `posts.getBySlug` / `posts.getByUuid` / `categories.list` を呼ぶと明示的なエラーを投げる)。

### 2. 記事を読む

```ts
const posts = await hagaki.posts.list({ sortBy: "date", order: "desc" });
const post = await hagaki.posts.getBySlug("hello-world");
// または uuid で
const same = await hagaki.posts.getByUuid(post!.uuid);
```

### 3. 記事を保存する

```ts
import { committerFromSession } from "hagaki/auth";

const session = await auth(); // better-auth / next-auth などの session
const committer = committerFromSession(session, {
  defaultEmail: "uuid+player@morino.party",
});

const result = await hagaki.posts.save({
  post, // PostDetail — title/slug/uuid/description/date/category/image?/body
  assets: [{ name: "cover.avif", content: avifBytes }], // 追加する画像（省略可）
  deleteAssets: ["old-cover.avif"],                     // 削除する画像（省略可）
  committer,
  // commitMessage は省略可: `Update post: <slug> (+N images, -M images)` が自動生成される
});
console.log(result.commitSha, result.commitUrl, result.paths, result.deletedPaths);
```

`posts.save` は 1 回の Git Data API コミットで `index.md` と `assets/` の追加・削除をまとめて反映する。内部で `post.uuid` の形式チェックと `assets` / `deleteAssets` のファイル名検証（`/` や `..` を含む名前は拒否）を行うので、呼び出し側で改めてパストラバーサル対策をする必要はない。

`post.date` が空文字なら保存時に今日の日付が採番される。既存記事の日付はそのまま維持される。

### 4. コミット状況を見る

```ts
const status = await hagaki.commits.status(result.commitSha);
// { sha, message, htmlUrl, authorName, authoredAt, checks: CheckRun[], state }
// state: "success" | "failure" | "pending" | "none"
```

`commits.commitFiles` は任意のファイル群を 1 コミットにまとめる低レベル脱出ハッチ（カテゴリ JSON の更新など、記事以外の書き込みに使う）:

```ts
await hagaki.commits.commitFiles({
  files: [{ path: "content/categories/news.json", content: JSON.stringify(category) }],
  deletePaths: [],
  commitMessage: "Update category: news",
});
```

### 5. エディタを使う

```tsx
"use client";
import { HagakiEditor } from "hagaki/react";
import type { ImageDirectiveAttrs } from "hagaki/markdown";
import { startPending } from "hagaki/pending-images";
import "@mdxeditor/editor/style.css";

async function handleInsertImage(file: File): Promise<ImageDirectiveAttrs> {
  const entry = await startPending({
    file,
    upload: async ({ id, avif }) => {
      const res = await fetch(`/api/images/${id}`, { method: "PUT", body: avif });
      if (!res.ok) throw new Error("upload failed");
      return `/api/images/${id}`; // preview URL
    },
  });
  return { id: entry.id, blurhash: entry.blurhash, width: entry.width, height: entry.height, alt: "" };
}

export function MyEditor({ markdown, onChange }: { markdown: string; onChange: (m: string) => void }) {
  return (
    <HagakiEditor
      markdown={markdown}
      onChange={onChange}
      onInsertImage={handleInsertImage}
      imagePreviewUrlFor={(id) => `/api/images/${id}`}
      contentEditableClassName="my-prose"
    >
      <HagakiEditor.Toolbar className="flex gap-1 border-b px-2 py-1">
        <HagakiEditor.UndoRedo />
        <HagakiEditor.BoldItalicUnderlineToggles />
        <HagakiEditor.InsertImage.DirectiveButton title="画像を挿入" />
      </HagakiEditor.Toolbar>
      <HagakiEditor.Content className="prose px-4 py-3 min-h-[400px]" />
    </HagakiEditor>
  );
}
```

Next.js では `dynamic(() => import("./MyEditor"), { ssr: false })` で読み込むこと（MDXEditor は client only）。

画像は本文中に `::img{id="<uuid>" blurhash=".." w=".." h=".." alt=".."}` という leaf directive として挿入される。`id` はそのまま `assets/<id>.avif` のファイル名になる。`onInsertImage` がファイルを受け取って directive の属性を返し、`imagePreviewUrlFor` がまだコミットされていない（pending）id を含むすべての id を表示 URL に解決する。

保存前に、本文が参照している未コミットの id を集めて `posts.save` の `assets` に渡し、消えた id は `diffRemovedImageIds` で拾って `deleteAssets` に渡す:

```ts
import { extractImageDirectiveIds, diffRemovedImageIds } from "hagaki/markdown";

const pendingIds = extractImageDirectiveIds(newBody).filter(
  (id) => !extractImageDirectiveIds(committedBody).includes(id),
);
const deleteAssets = diffRemovedImageIds(committedBody, newBody).map((id) => `${id}.avif`);
```

### 6. 読み取り専用ページで本文を描画する

```ts
import { markdownToHtml } from "hagaki/markdown";
import { resolveCdnUrl } from "hagaki";

const html = await markdownToHtml(post.body, {
  imageUrlFor: (id) => resolveCdnUrl(`/article/${post.uuid}/assets/${id}.avif`, cdnBaseUrl),
});
```

`::img` directive を blurhash プレースホルダ付きの `<span data-hagaki-img>` に変換する。プレースホルダはインライン `onload` でフェードインするだけなので、クライアント JS は一切不要。

## Markdown 機能

`hagaki/react` の `defaultPlugins()` で有効になっているもの / 未対応のものの一覧。

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

- [x] `::img` directive による画像挿入 — `onInsertImage` + `imagePreviewUrlFor` を渡したときだけ有効（`<HagakiEditor.InsertImage.DirectiveButton>`）
- [x] 保存前の未コミット画像収集 / 削除画像検出（`extractImageDirectiveIds` / `diffRemovedImageIds`、`hagaki/markdown`）
- [x] blurhash プレースホルダ生成・解析（`hagaki/image` の `analyzeImage`、`hagaki/markdown` の `blurhashToDataUrl`）
- [ ] ドラッグ&ドロップ / クリップボード貼り付けでのアップロード（`onInsertImage` を自前のドロップハンドラに配線する必要あり）
- [ ] GitHub への画像アップロード組み込みヘルパ（`upload` は呼び出し側が実装する — 一時ストレージへの PUT を想定）

### ツールバー

- [x] `toolbarPlugin`（`toolbarContents` を渡したときだけ有効、または `<HagakiEditor.Toolbar>` スロットで手組み）
- [x] 個別スタイル可能なボタン: `Undo` / `Redo` / `Bold` / `Italic` / `Underline` / `Strikethrough` / `InlineCode` / `BulletList` / `NumberedList` / `CheckList` / `InsertImage.DirectiveButton`
- [x] 再エクスポート: `BlockTypeSelect` / `BoldItalicUnderlineToggles` / `CodeToggle` / `ConditionalContents` / `CreateLink` / `DiffSourceToggleWrapper` / `InsertAdmonition` / `InsertCodeBlock` / `InsertTable` / `InsertThematicBreak` / `ListsToggle` / `Separator` / `UndoRedo`
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
| `hagaki`               | `createHagakiClient`, `HagakiClient`, `HagakiConfig`, `Post`/`PostDetail`/`Category`/`CommitResult`/`CommitStatus`/`CheckRun` 等の型, `toUrlSlug`, `resolveCdnUrl`, `articlePaths`, `postFrontmatter` |
| `hagaki/react`         | `HagakiEditor`, `defaultPlugins`, `defaultToolbarContents` |
| `hagaki/auth`          | `Committer`, `makeCommitter`, `committerFromSession` |
| `hagaki/image`         | `analyzeImage`, `encodeAnalyzedImage`, `validateAvifUpload`, `isAvif` |
| `hagaki/markdown`      | `markdownToHtml`, `extractImageDirectiveIds`, `diffRemovedImageIds`, `imageDirectiveMarkdown`, `blurhashToDataUrl` |
| `hagaki/pending-images`| `startPending`, `getPending`, `listPending`, `removePending`, `hasActive`, `hasErrors`, `subscribe`, `clearAll` |

## テンプレート

`template/tanstack-workers` に、TanStack Start + Cloudflare Workers 上で hagaki を動かす一式テンプレートがある。詳細は [`template/README.md`](./template/README.md) を参照。

## License

MIT
