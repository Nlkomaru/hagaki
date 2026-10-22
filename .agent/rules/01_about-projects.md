## このアプリケーションの概要
「hagaki」という、GitHub をストレージにする headless なマークダウンエディタとコンテンツ API の TypeScript ライブラリです。
リポジトリ名は `hagaki`、パッケージ名は `@morinoparty/hagaki` です。

deploy するものではなく、ライブラリとして利用されます。GitHub Release を publish すると、そのタグ (`v0.2.0` など) の版が GitHub Actions (`.github/workflows/publish.yml`) から GitHub Packages (`https://npm.pkg.github.com`) に公開されます。
`package.json` の `version` は据え置きで、公開時の version はリリースのタグから決まります。

## 目的
GitHub のリポジトリをコンテンツの保存先として、記事の読み書き・編集 UI・画像処理・配信をまとめて提供します。
現在、以下の機能があります。

- **コア API** (`hagaki`) - Octokit で GitHub を読み書きし、配信済みコンテンツ (CDN) の取得とコミット情報の取得もまとめた client (`createHagakiClient`)。フレームワークや認証方式には依存しない
- **エディタ** (`hagaki/editor`) - `@mdxeditor/editor` を薄く包んだ headless な React コンポーネント (`HagakiEditor`)。スタイルは持たず、`className` で指定する
- **画像** (`hagaki/image`, `hagaki/pending-images`) - ブラウザで AVIF にエンコードし、保存するまではタブのメモリに置く。保存時に本文と同じコミットへ入れる
- **CLI** (`hagaki generate`) - コンテンツリポジトリの manifest (`article/<uuid>/info.json` / `article.json` / `slug-index.json` / `categories.json`) を生成する
- **配信 worker** (`hagaki/content-worker`) - Workers Static Assets の前段に置く Hono アプリ。下書き (`draft: true`) の記事への直接アクセスを 404 にする

利用例:
- [Nlkomaru/hagaki-content](https://github.com/Nlkomaru/hagaki-content): サンプルのコンテンツリポジトリ
- [morinoparty/wiki-content](https://github.com/morinoparty/wiki-content): wiki のコンテンツ
- [morinoparty/wiki-frontend](https://github.com/morinoparty/wiki-frontend): wiki の編集・閲覧 UI

### 読み取り先
client の読み取り先は「配信済み (CDN)」と「リポジトリ (GitHub)」の 2 つです。
一覧や公開ページは CDN を読み、エディタのように**まだデプロイされていないコミットを見たい**ところはリポジトリを読みます。
認証や権限といったアプリ固有の概念は持たず、コミットの著者だけ `Committer` で受け取ります。

### コンテンツフォーマット
- 記事は `content/article/<uuid>/index.mdx` (frontmatter + MDX)、画像は `content/article/<uuid>/assets/<imageId>.avif`、カテゴリは `content/categories/<slug>.json` です。
- `slug` は変わりうるが `uuid` は不変なので、パスは常に uuid ベースです。
- 下書きは frontmatter の `draft: true` で表し、manifest や slug-index に載りません。
- フォーマットの詳細は `sample/README.md` を参照してください。フォーマットを変える場合は `sample/README.md` も合わせて更新してください。

## 主な技術スタック
- TypeScript (言語。`strict` / `noUncheckedIndexedAccess`)
- tsdown (ビルド。`tsdown.config.ts`)
- Biome (フォーマッター & Linter。`biome.json`)
- Octokit (GitHub API)
- React / `@mdxeditor/editor` / lexical (エディタ。いずれも optional な peerDependencies)
- `@jsquash/avif` / blurhash (画像のエンコードとプレースホルダ)
- unified / remark-parse / remark-mdx / gray-matter (マークダウンと frontmatter の解析)
- Hono (配信 worker)
- pnpm 12 (`packageManager`) / Node.js 26.12 以上 (`.node-version`, `engines`)

## Entry points
| import path | ソース | 実行環境 |
|---|---|---|
| `hagaki` | `src/index.ts` | どこでも |
| `hagaki/react` | `src/react.ts` | どこでも (SSR 可、エディタなし) |
| `hagaki/editor` | `src/editor.ts` | ブラウザ |
| `hagaki/image` | `src/image.ts` | エンコードはブラウザ、検証はどこでも |
| `hagaki/markdown` | `src/markdown.ts` | どこでも |
| `hagaki/pending-images` | `src/pending-images.ts` | ブラウザ |
| `hagaki/auth/better-auth` | `src/auth/better-auth.ts` | どこでも |
| `hagaki/content-worker` | `src/content-worker/index.ts` | Workers |
| `hagaki` コマンド (bin) | `src/cli/index.ts` | Node.js |

entry point を追加・変更する場合は、`tsdown.config.ts` の `entry`、`package.json` の `exports`、README の Entry points 表をそろえて更新してください。

## pnpm workspace
`pnpm-workspace.yaml` で、ルート (hagaki 本体) と以下のテンプレートを 1 つの workspace にしています。テンプレートは hagaki を `workspace:*` で参照します。

- `template/tanstack-workers` - 編集・閲覧 UI (TanStack Start + Vite、cf CLI で Workers に配信)
- `template/content-worker` - `hagaki generate` の生成物と記事を配信する Worker
