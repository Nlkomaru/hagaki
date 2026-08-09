# hagaki コンテンツフォーマット

コンテンツリポジトリ（GitHub をストレージとして使う側）のディレクトリレイアウトと
ファイルフォーマットの定義。このディレクトリはそのリファレンス実装を兼ねる。

## ディレクトリレイアウト

```text
content/
├── article/
│   └── <uuid>/                 # 記事ディレクトリ（uuid = frontmatter の uuid と一致）
│       ├── index.mdx           # 記事本体（frontmatter + MDX）
│       ├── info.json           # 生成物: 記事メタデータ（手書きしない）
│       └── assets/
│           └── <imageId>.avif  # 記事に属する画像（imageId は uuid、AVIF 固定）
├── categories/
│   └── <slug>.json             # カテゴリ定義（slug = ファイル名）
├── article.json                # 生成物: 全記事 manifest
├── slug-index.json             # 生成物: slug → uuid マップ（issue #4）
└── categories.json             # 生成物: カテゴリ一覧
```

- `slug` は変わりうるが `uuid` は記事の一生を通じて不変。パスは常に uuid ベース。
- 「生成物」は手書き・コミットせず、コンテンツリポジトリへの push で走る
  GitHub Actions が生成して、そのまま `wrangler deploy` に含める。
  詳細は[生成物](#生成物github-actions)を参照。

## 記事 frontmatter（`article/<uuid>/index.mdx`）

YAML。gray-matter（js-yaml）でシリアライズされる形（2スペースインデント）に合わせる。

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `title` | string | ✓ | 記事タイトル |
| `slug` | string | ✓ | URL 用スラッグ。変更可 |
| `uuid` | string (UUID) | ✓ | ディレクトリ名と一致。不変 |
| `category` | string | ✓ | カテゴリの `slug` を参照 |
| `description` | string | ✓ | 概要。空なら `''` |
| `thumbnail` | object | – | サムネイル。無い記事では省略 |
| `thumbnail.imageId` | string (UUID) | ✓* | `assets/<imageId>.avif` を指す。パスは uuid + imageId から導出できるので書かない |
| `thumbnail.blurhash64` | string | ✓* | blurhash を **base64 エンコード**した文字列（下記参照） |

\* `thumbnail` を書く場合は必須。

### blurhash64

blurhash は base83 文字集合（`{` `}` `|` `$` `%` `@` など）を含み、YAML や
JSX 属性でエスケープ事故を起こしやすい。保存形では常に **base64 エンコード**
した `blurhash64` を使い、デコードは描画直前に行う:

```js
const blurhash = atob(blurhash64); // → blurhashToDataUrl(blurhash, w, h)
```

### 編集履歴（`modified`）— 補助フィールド

編集履歴の**一次ソースは git のコミット履歴**。`makeCommitter` の既定では
committer 名が `"<表示名> (<player uuid>)"` になるため、コミットから
「いつ・誰が」を復元できる（email はセッションの email、無ければ
`defaultEmail` のフォールバック）。

`modified` はそれを補うためだけのフィールドで、別システムから移行した記事の
**git 以前の編集履歴**を保存する場所。移行記事以外では省略する。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `modified[].date` | string (ISO 8601 UTC) | 例: `2024-06-19T15:00:00.000Z` |
| `modified[].player` | string (UUID) | 編集した Minecraft プレイヤーの UUID |

- 昇順で並べる（先頭 = 元システムでの作成、末尾 = 移行前の最後の編集）。
- git 移行後の編集では**追記しない**。保存はコミットとして記録される。
- 完全な履歴が欲しいときは `modified` と該当ファイルの git コミットを
  date 昇順でマージする。
- 記事の作成日時は `modified[0].date`、無ければ最初の git コミット日時。

移行記事を想定した frontmatter の例（`modified` 付き）:

```yaml
---
title: 記法サンプル
slug: test
uuid: 0e95538c-f931-4616-8b39-88cb608c90b4
category: general
description: hagaki のコンテンツフォーマットと Markdown 記法のサンプル記事
thumbnail:
  imageId: 98e879e4-d625-4ca7-8e20-4df80ab0c285
  blurhash64: VUhLMGc4JCV4XlZzfld4dFJpdFIlZ05iTXtWQHNTb2ZWQHNv
modified:
  - date: 2024-06-19T15:00:00.000Z
    player: f8b761ec-4a54-48eb-a040-c5604042bcc9
  - date: 2024-06-20T12:30:00.000Z
    player: 389b1a68-f647-4dd0-a421-61b6c22fdebe
---
```

## 記事本文

MDX（Markdown + `<Image />` コンポーネントのみ）。hagaki 自身はレンダリングを持たず、
利用側が remark/MDX パイプラインで `components={{ Image }}`（`hagaki/react` の
`<Image>`）を渡して描画する。

画像は `imageComponentMarkdown()` が出力する正規形で書く:

```mdx
<Image imageId="<uuid>" blurHash64="<base64のblurhash>" width="1920" height="1280" alt="…" />
```

- `articleId` は書かない（描画側の `<HagakiImageConfig articleId={…}>` が補う）。
- 属性はすべて文字列属性（`width="1920"`、`width={1920}` ではない）。
- `blurHash64` は [blurhash64](#blurhash64) と同じ base64 形式。生の blurhash や
  URL エンコードを属性に書かない。

## カテゴリ（`categories/<slug>.json`）

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `title` | string | 表示名 |
| `slug` | string | ファイル名と一致 |
| `body` | string | カテゴリの説明文 |
| `option` | object? | 記事が持つ追加 frontmatter フィールドの宣言。任意 |

`option` は「このカテゴリの記事が何を追加で持つか」をキーごとに宣言する。
値の意味は hagaki は関知せず、エディタが入力欄を描くのに必要な情報だけを持つ。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `option.<key>.type` | `"string"` \| `"integer"` \| `"number"` \| `"boolean"` | 値の種類 |
| `option.<key>.label` | string? | 入力欄のラベル。省略時はキー名 |
| `option.<key>.description` | string? | 入力欄に添える説明 |
| `option.<key>.placeholder` | string? | 未入力時のプレースホルダ |
| `option.<key>.required` | boolean? | 記事が必ず持つ必要があるか |

キーは記事の frontmatter に保存されるキーそのもの。

```json
{
    "title": "General",
    "slug": "general",
    "body": "一般的な記事",
    "option": {
        "x": {
            "type": "integer",
            "label": "X座標",
            "description": "ワールド座標の X。地図で記事を探すのに使う",
            "placeholder": "1000",
            "required": true
        }
    }
}
```

カテゴリの並び順は `slug` 昇順。順番を制御したい場合は slug で調整する。

## 生成物（GitHub Actions）

コンテンツリポジトリへの push で GitHub Actions が `generate-lists.ts` を
実行して以下を生成し、そのまま `wrangler deploy` の Assets に含める。
git にはコミットしない（`.gitignore` 対象）。

### `article/<uuid>/info.json` — 記事メタデータ

frontmatter と git 履歴から作る記事単体のメタデータ。`modified`（移行履歴）と
git コミット履歴のマージは**ここで焼き込む**ので、消費側は git を触らずに
完全な履歴を読める。

```json
{
    "title": "記法サンプル",
    "slug": "test",
    "uuid": "0e95538c-f931-4616-8b39-88cb608c90b4",
    "category": "general",
    "description": "…",
    "thumbnail": {
        "imageId": "98e879e4-d625-4ca7-8e20-4df80ab0c285",
        "blurhash64": "VUhLMGc4JCV4XlZzfld4dFJpdFIlZ05iTXtWQHNTb2ZWQHNv"
    },
    "created": "2024-06-19T15:00:00.000Z",
    "updated": "2026-08-01T00:00:00.000Z",
    "history": [
        { "date": "2024-06-19T15:00:00.000Z", "player": "f8b761ec-…", "source": "imported" },
        { "date": "2026-08-01T00:00:00.000Z", "player": "389b1a68-…", "source": "git", "commit": "<sha>" }
    ]
}
```

- `history` = frontmatter の `modified`（`source: "imported"`）と、該当記事
  ディレクトリに触れた git コミット（`source: "git"`、`player` は committer 名
  `"<表示名> (<uuid>)"` から抽出）を date 昇順でマージしたもの。
- `created` = `history` 先頭の date、`updated` = 末尾の date。

### `article.json` — 全記事 manifest

`info.json` から `history` を除いたオブジェクトの配列。一覧・ソート用。

### `slug-index.json` — slug → uuid マップ

[issue #4](https://github.com/Nlkomaru/hagaki/issues/4) 対応。`getPostBySlug` が
manifest 全件の線形探索をやめて O(1) で uuid を引けるようにする。

```json
{ "test": "0e95538c-f931-4616-8b39-88cb608c90b4" }
```

### `categories.json` — カテゴリ一覧

`categories/*.json` を連結した配列。

## コミットメッセージ

[gitmoji](https://gitmoji.dev) を参考にする。コンテンツの追加・更新は
`📝 Update post: <slug>`（`savePost` と template の既定メッセージ）。

## 実装状況

フォーマットは `src/` と `template/` に実装済み:

- `index.mdx` パス: `src/api/content.ts` / `src/api/posts.ts` / 各 template。
- `thumbnail` / `modified` の温存: `savePost` と template の `postFrontmatter`
  は値があるときだけ frontmatter に書き出す（無ければ省略）。
- `blurhash64`: `<Image>` の語彙（`image-jsx.ts`）は `blurHash64` 属性で
  読み書きし、`hagaki/react` の `<Image>` も `blurHash64` のみ受ける。
  内部 API（`ImageComponentAttrs.blurhash` など）は生の blurhash のまま。
- 生成物: `generate-lists.ts` が `info.json` / `article.json` /
  `slug-index.json` / `categories.json` を生成。`getPostBySlug` は
  slug-index を引き、404 なら manifest 走査にフォールバック。
  `getPostByUuid` は `info.json` から `created` / `updated` を補う。
- Actions: `template/content-worker/.github/workflows/deploy.yml`
  （履歴マージのため `fetch-depth: 0` 必須）。

未対応:

- エディタ UI から `thumbnail` を設定する手段がまだない。
- `history` を表示する UI がまだない。
- `migrate-to-article.ts` は旧 wiki レイアウト用のままで、`modified` への
  変換は実際の移行元に合わせて別途実装が必要。
