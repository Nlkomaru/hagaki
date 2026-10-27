# hagaki

GitHub をストレージにする、headless なマークダウンエディタとコンテンツ API のライブラリ。

- **コア API**: Octokit で GitHub を読み書きし、配信済みコンテンツの取得とコミット情報の取得もまとめた client。フレームワークや認証方式には依存しない。
- **エディタ**: `@mdxeditor/editor` を薄く包んだ headless な React コンポーネント。スタイルは持たず、`className` で指定する。
- **画像**: ブラウザで AVIF にエンコードし、保存するまではメモリに置いておく (`hagaki/pending-images`)。保存時に本文と同じコミットへ入れる。
- **CLI / 配信 worker**: コンテンツリポジトリの manifest を生成する `hagaki generate` と、下書きを配信しない Hono アプリ。

deploy するものではなく、ライブラリとして使う。利用例は次のとおり。

- [Nlkomaru/hagaki-content](https://github.com/Nlkomaru/hagaki-content): サンプルのコンテンツリポジトリ
- [morinoparty/wiki-content](https://github.com/morinoparty/wiki-content): wiki のコンテンツ (Worker `wiki-content`)
- [morinoparty/wiki-frontend](https://github.com/morinoparty/wiki-frontend): wiki の編集・閲覧 UI (Worker `wiki-frontend`)

## Install

GitHub Packages に `@morinoparty/hagaki` として公開している。GitHub Release を
publish すると、そのタグ (`v0.2.0` など) の版を Actions が公開する
(`.github/workflows/publish.yml`)。

GitHub Packages の npm レジストリは公開パッケージでも認証が要るので、`.npmrc` に
スコープとトークン (`read:packages`) を設定してから入れる。

```sh
# .npmrc
# @morinoparty:registry=https://npm.pkg.github.com
# //npm.pkg.github.com/:_authToken=<read:packages を持つトークン>
pnpm add @morinoparty/hagaki
# エディタを使う場合 (lexical は @mdxeditor/editor と同じ版にそろえる)
pnpm add @mdxeditor/editor @mdxeditor/gurx lexical@^0.48.0 react react-dom
```

動作環境は Node.js 26.12 以上。

## Quick start

### 1. Client を作る

```ts
import { createHagakiClient } from "@morinoparty/hagaki";

const hagaki = createHagakiClient({
  github: {
    owner: "morinoparty",
    repo: "wiki-content",
    branch: "main",
    contentPath: "content/article", // 各記事は content/article/<uuid>/index.mdx
    auth: env.HAGAKI_GITHUB_TOKEN, // string でも () => Promise<string> でも可
  },
  content: {
    // コンテンツ Worker の配信 URL (<subdomain> はアカウントの workers.dev)
    cdnBaseUrl: "https://wiki-content.<subdomain>.workers.dev",
  },
});

const posts = await hagaki.posts.list({ sortBy: "created", order: "desc" });
const post = await hagaki.posts.getBySlug("hello-world");
```

### 2. 記事を保存する

```ts
import { committerFromBetterAuth } from "@morinoparty/hagaki/auth/better-auth";

// committer 名は "<name> (<session.user.id>)" になる。この ID が履歴の userId
const committer = committerFromBetterAuth(session, {
  defaultEmail: "noreply@example.com",
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
import { HagakiEditor } from "@morinoparty/hagaki/editor";
import { getPending, startPending } from "@morinoparty/hagaki/pending-images";
import "@mdxeditor/editor/style.css";

export function MyEditor(props: {
  markdown: string;
  onChange: (m: string) => void;
  committedUrl: (imageId: string) => string;
}) {
  return (
    <HagakiEditor
      markdown={props.markdown}
      onChange={props.onChange}
      onInsertImage={async (file) => {
        const entry = await startPending({ file });
        return { id: entry.id, blurhash: entry.blurhash, width: entry.width, height: entry.height, alt: "" };
      }}
      imagePreviewUrlFor={(id) => getPending(id)?.previewUrl ?? props.committedUrl(id)}
    >
      <HagakiEditor.Toolbar>
        <HagakiEditor.UndoRedo />
        <HagakiEditor.InsertImage.ComponentButton />
      </HagakiEditor.Toolbar>
      <HagakiEditor.Content className="my-prose" />
    </HagakiEditor>
  );
}
```

MDXEditor はクライアント専用なので、`lazy(() => import(...))` などで遅延読み込みする。

## 画像 (`hagaki/pending-images`)

エディタに入れた画像は、保存するまでどこにもアップロードしない。
ブラウザで AVIF にエンコードした `Blob` をタブのメモリに保持し、保存時に
本文と一緒にサーバへ送って 1 コミットにまとめる。一時置き場 (R2 など) は要らない。

| 状態 | 意味 |
|---|---|
| `encoding` | blurhash と寸法は確定済みで、AVIF エンコード中。エディタはぼかしのプレースホルダを出す |
| `ready` | `blob` と `previewUrl` (`blob:` の object URL) がある。コミットできる |
| `error` | エンコードに失敗した。`error` に原因が入る |

1. **挿入**: `startPending({ file })` は blurhash が出た時点で resolve するので、すぐに `<Image imageId="…" />` を挿入できる。エンコードは裏で続く。
2. **プレビュー**: `imagePreviewUrlFor` で `getPending(id)?.previewUrl` を返し、なければコミット済みの URL を返す。
3. **保存ボタンの制御**: `subscribe(fn)` と `hasActive()` / `hasErrors()` を使う。エディタの `onChange` で `sweepOrphanedErrors(body)` を呼ぶと、本文から消えた失敗画像の分のエラーが残らない。
4. **保存 (ブラウザ側)**:

   ```ts
   import {
     collectPendingImages,
     findUncommittedImageIds,
     PendingImageError,
     removePending,
   } from "@morinoparty/hagaki/pending-images";

   // 本文が参照していて、まだコミットされていない画像 (サムネイル等の id は自分で足す)
   const ids = findUncommittedImageIds(body, committedBody);
   // エンコード完了を待って { imageId, blob }[] を得る。失敗した画像や
   // リロードで失われた画像があると PendingImageError (failedIds / missingIds) を投げる
   const images = await collectPendingImages(ids);

   const form = new FormData();
   form.set("body", body);
   for (const { imageId, blob } of images) {
     form.append("imageId", imageId);
     form.append("image", blob);
   }
   await savePost(form); // Server Action / API など

   // 成功後: 先に committedBody を更新して表示をコミット済み URL へ切り替え、
   // それからコミットに入れた分だけ破棄する (object URL も revoke される)。
   // clearAll() だと、保存中に挿入された画像まで消えてしまう。
   setCommittedBody(body);
   for (const { imageId } of images) removePending(imageId);
   ```

5. **保存 (サーバ側)**: 受け取ったバイト列を `validateAvifUpload` (`hagaki/image`) で確かめ、本文と一緒に `posts.save` の `files` (または `commits.commitFiles`) に渡す。`CommitFile.content` は `Uint8Array` / `ArrayBuffer` / `Blob` (`FormData` の `File` もそのまま渡せる) / 文字列を受け付ける。JSON で base64 を受け取った場合は `encoding: "base64"` を付ける。

   リポジトリ上のパスはサーバ側で組み立てる。クライアントが送るファイル名や id は
   信用せず、記事の `uuid` と各 `imageId` を UUID の形か確かめてから使う
   (`../../.github/workflows/x.yml` のような名前で記事の外へ書き込まれるのを防ぐ)。

   ```ts
   import { validateAvifUpload } from "@morinoparty/hagaki/image";

   const UUID_REGEX = /^[a-f0-9-]{36}$/i;
   if (!UUID_REGEX.test(uuid)) throw new Error("invalid post uuid");

   const ids = form.getAll("imageId");
   const blobs = form.getAll("image");
   if (ids.length !== blobs.length) throw new Error("imageId / image mismatch");

   const files = [];
   for (const [i, imageId] of ids.entries()) {
     const blob = blobs[i];
     if (typeof imageId !== "string" || !UUID_REGEX.test(imageId)) {
       throw new Error("invalid image id");
     }
     if (!(blob instanceof Blob)) throw new Error("image must be a file");
     const bytes = new Uint8Array(await blob.arrayBuffer());
     validateAvifUpload(bytes); // 500 KB 以下の AVIF か
     // パスは id から作る。file.name は使わない
     files.push({ path: `content/article/${uuid}/assets/${imageId}.avif`, content: bytes });
   }
   await hagaki.posts.save(post, { committer, files, deletePaths });
   ```

画像はタブのメモリにしかないので、保存前にリロードすると失われる
(`collectPendingImages` が `missingIds` で知らせる)。挿入し直してもらう。

## Client API

`createHagakiClient` が返す client の一覧。読み取り先は「配信済み (CDN)」と
「リポジトリ (GitHub)」の 2 つ。一覧や公開ページは CDN を読み、エディタのように
**まだデプロイされていないコミットを見たい**ところはリポジトリを読む。

| API | 読み先 | 内容 |
|---|---|---|
| `posts.list(options?)` | CDN | `article.json` の記事一覧。`sortBy: created \| updated \| title` |
| `posts.getBySlug(slug)` | CDN | `slug-index.json` で uuid を引き、本文と `info.json` を返す |
| `posts.getByUuid(uuid)` | CDN | 同上 (uuid を直接指定) |
| `posts.getFromRepo(uuid, { ref })` | GitHub | リポジトリ上の `index.mdx`。`ref` で過去のリビジョン |
| `posts.existsInRepo(uuid)` | GitHub | 記事本体があるか |
| `posts.listUuidsInRepo()` | GitHub | 下書きを含む全記事の uuid |
| `posts.repoPaths(uuid)` | GitHub | 記事ディレクトリ配下の全パス (削除時に `deletePaths` へ渡す) |
| `posts.history(uuid, { perPage, page })` | GitHub | `index.mdx` に触れたコミット (新しい順)。`page` で古いページを読む |
| `posts.firstCommit(uuid)` | GitHub | `index.mdx` に触れた最古のコミット (= 作成したコミット)。履歴の長さによらず最大 2 リクエスト。無ければ `null` |
| `posts.diff(uuid, base, head)` | GitHub | 2 コミット間の本文の unified diff |
| `posts.save(post, options?)` | GitHub | frontmatter と本文を保存。`files` / `deletePaths` を渡すと画像の追加・削除も同じコミットにする |
| `categories.list()` | CDN | `categories.json` |
| `files.get(path, ref?)` | GitHub | 任意ファイルの内容 (UTF-8) |
| `files.getBinary(path, ref?)` | GitHub | 任意ファイルのバイト列 (画像など) |
| `files.exists(path, ref?)` | GitHub | 存在確認 |
| `files.list(path, ref?)` | GitHub | ディレクトリ 1 階層 |
| `files.listRecursive(path, ref?)` | GitHub | 配下の全ファイルパス |
| `files.firstCommit(path)` | GitHub | 任意パスに触れた最古のコミット |
| `commits.commitFiles(input)` | GitHub | 複数ファイルの追加・更新・削除を 1 コミットに |
| `commits.getWithChecks(sha)` | GitHub | コミットと check runs |

```ts
// 記事を assets ごと削除する
await hagaki.commits.commitFiles({
  deletePaths: await hagaki.posts.repoPaths(uuid),
  commitMessage: "🔥 Delete post",
});
```

認証や権限といったアプリ固有の概念は持たない。コミットの著者だけ
`Committer` (`hagaki/auth/better-auth` の `committerFromBetterAuth`) で渡す。

### ユーザー ID

hagaki が扱うユーザーの識別子は、認証ライブラリが返す安定したユーザー ID
だけである。better-auth なら `session.user.id` で、`userIdFromSession(session)`
はその値をそのまま返す。ID の中身 (OIDC の `sub`、DB のキー、ゲームの
アカウント ID など) は解釈しない。

- `committerFromBetterAuth` は committer 名を `"<name> (<id>)"` にする
  (`makeCommitter` の既定のフォーマット)。
- `userIdFromCommitterName` はその末尾の括弧の中身を取り出す。フォーマットの
  厳密な逆関数で、`makeCommitter` は括弧・空白・`<`・`>`・制御文字を含む ID を
  拒否する。git は名前から `<` と `>` を取り除くので、これらを含む ID は
  `git log` から同じ値で読み戻せないためである。
  規約外の名前 (hagaki 以外からのコミット、独自の `nameFormat`) は `null` になる。
- 履歴 (`PathCommit.userId`、`info.json` の `history[].userId`)、`article.json`
  の `editors[].userId`、frontmatter の `modified[].userId` と `editor` は、
  すべてこの ID で揃う。
- DB を持たない構成では、ログインのたびに ID が変わらないよう、プロバイダの
  ID を `session.user.id` に使う (`mapOAuthProfile` を参照)。テンプレートのように
  `session.user.id` を使わず OIDC の `sub` を直接 committer に渡してもよい。
  その場合は `sub` がユーザー ID になる。

```ts
import { userIdFromSession } from "@morinoparty/hagaki/auth/better-auth";

const userId = userIdFromSession(session);
const creator = (await hagaki.posts.firstCommit(uuid))?.userId ?? null;
const mayEdit = userId !== null &&
  (post.editor?.includes(userId) || creator === userId);
```

下書きはコンテンツフォーマットの一部 (frontmatter の `draft: true`)。
manifest や slug-index に載らず、`hagaki/content-worker` が `article/<uuid>/`
配下への直接アクセスを 404 にするので、リポジトリ経由
(`posts.getFromRepo` / `posts.listUuidsInRepo`) でしか読めない。

frontmatter の `editor` (ユーザー ID の配列) は
`WikiPostDetail.editor` として読み書きする。hagaki は値を正規化して運ぶだけで、
編集権限として扱うかどうかは利用側が決める。同じ正規化は `parseEditorList` で使える。

下書きと `editor` を含むフォーマットの詳細は [`sample/README.md`](./sample/README.md) を参照。

## CLI

コンテンツリポジトリは hagaki を依存に入れ、CLI で生成物を作る。

```sh
hagaki generate [--content-dir ./content]
```

`article/<uuid>/info.json` / `article.json` / `slug-index.json` /
`categories.json` を生成する。編集履歴のマージに git を使うので、
Actions では `fetch-depth: 0` で checkout する。

## 配信 worker (`hagaki/content-worker`)

Workers Static Assets の前段に置く Hono アプリ。下書きの遮断だけを担当し、
それ以外は静的配信にそのまま渡す。

```ts
// src/index.ts
import { createContentApp } from "@morinoparty/hagaki/content-worker";
export default createContentApp();
```

```ts
// cloudflare.config.ts (assets のディレクトリは wrangler.config.ts の assetsDirectory)
import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "hagaki-content",
    compatibilityDate: "2026-10-01",
    entrypoint: "src/index.ts",
    workersDev: true,
    assets: { runWorkerFirst: ["/article/*"] },
    env: { ASSETS: bindings.assets() },
  },
});
```

一式は [`template/content-worker`](./template/content-worker) にある。

## Entry points

| import path | 内容 | 実行環境 |
|---|---|---|
| `hagaki` | `createHagakiClient`、型、`toUrlSlug`、`resolveCdnUrl` など | どこでも |
| `hagaki/react` | `<Image>` と `HagakiImageConfig` (SSR 可、エディタなし) | どこでも |
| `hagaki/editor` | `HagakiEditor` とツールバー部品 | ブラウザ |
| `hagaki/image` | AVIF エンコードと blurhash (`processImage` など)、`validateAvifUpload` | エンコードはブラウザ、検証はどこでも |
| `hagaki/markdown` | `<Image />` の組み立て・抽出、画像パスの差分、blurhash ユーティリティ | どこでも |
| `hagaki/pending-images` | 保存前の画像を置くメモリ上のストア | ブラウザ |
| `hagaki/auth/better-auth` | `committerFromBetterAuth`、`userIdFromSession`、`mapOAuthProfile` | どこでも |
| `hagaki/content-worker` | `createContentApp` | Workers |

## 破壊的変更: `userId` への改名

hagaki 0.3 までは、編集者の ID を Minecraft のプレイヤー前提で `player` と
呼んでいた。認証方式に依存しないよう、次のリリースからすべて `userId` に改名した。
古いキーは読まない (フォールバックしない)。

| 0.3 まで | 改名後 |
|---|---|
| `PathCommit.player` | `PathCommit.userId` |
| `WikiHistoryEntry.player` (`info.json` の `history[].player`) | `WikiHistoryEntry.userId` |
| `EditorSummary.player` (`article.json` の `editors[].player`) | `EditorSummary.userId` |
| `ImportedEdit.player` (frontmatter の `modified[].player`) | `ImportedEdit.userId` (`modified[].userId`) |
| `playerFromCommitterName` | `userIdFromCommitterName` |

あわせて以下も変わった。

- `userIdFromCommitterName` は 36 文字の UUID に限らず、末尾の括弧の中の任意の
  ID (括弧・空白・`<`・`>`・制御文字を含まないもの) を取り出す。
- `makeCommitter` の既定のフォーマットは、括弧・空白・`<`・`>`・制御文字を含む
  ID を渡すと例外を投げる。
- `posts.history` / `posts.firstCommit` は、リポジトリの既定ブランチではなく
  `github.branch` で設定したブランチの履歴を読む。
- `posts.firstCommit` / `files.firstCommit` と、`posts.history` の `page` を追加した。

コンテンツリポジトリは、hagaki を上げるのと同じ変更で frontmatter の
`modified[].player:` を `modified[].userId:` に書き換え、`hagaki generate`
し直す。生成物 (`info.json` / `article.json`) を読むアプリは、配信中のコンテンツが
入れ替わるまで `userId ?? player` のように両方を読む。

記事を保存するアプリは、コンテンツの書き換えと hagaki の更新を同時に行う。
`modified` を読み戻せない組み合わせで `getFromRepo` → `save` すると、
`modified` が丸ごと消えるためである。改名後の hagaki で `player` のままの記事を
保存しても、0.3 の hagaki で `userId` に書き換え済みの記事を保存しても同じことが起きる。

## 開発

```sh
pnpm install
pnpm run typecheck
pnpm run check      # biome (書き込みあり。CI は check:ci)
pnpm run build      # tsdown → dist/
```

Node.js 26.12 以上 (`.node-version`) と pnpm 12 (`packageManager`) を使う。
main に push すると、CI が typecheck と biome check を通したうえで `dist` ブランチを更新する。

## License

MIT
