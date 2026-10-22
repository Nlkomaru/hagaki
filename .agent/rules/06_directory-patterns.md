## ディレクトリ配置規則

- src/ にライブラリのソースを配置します。
  - src/index.ts, src/react.ts, src/editor.ts, src/image.ts, src/markdown.ts, src/pending-images.ts は各 entry point の公開 API を re-export するファイルです。実装は下のディレクトリに置きます。
  - src/api/ に GitHub / CDN を読み書きする client の実装 (`client.ts`, `posts.ts`, `files.ts`, `commits.ts`, `tree-commit.ts`, `content.ts` など) と共通の型 (`types.ts`) を配置します。
  - src/editor/ にエディタの React コンポーネント (`Editor.tsx`, `Toolbar.tsx`, `Content.tsx` など) を配置します。コンポーネントのファイルには先頭に `"use client";` を付けます (`plugins.tsx` のようにプラグイン設定だけのファイルには付いていません)。
  - src/render/ にエディタを含まない描画用コンポーネント (`Image.tsx`) を配置します。
  - src/image/ に AVIF エンコードと blurhash の処理 (`pipeline.ts`) とアップロード検証 (`validation.ts`) を配置します。
  - src/markdown/ に `<Image />` JSX の組み立て・抽出や blurhash のユーティリティを配置します。
  - src/pending-images/ に保存前の画像を置くメモリ上のストア (`store.ts`) を配置します。
  - src/auth/ にコミットの著者 (`Committer`) を作る処理を配置します。認証ライブラリごとのアダプタは `src/auth/<名前>.ts` (例: `better-auth.ts`) にします。
  - src/cli/ に `hagaki` コマンド (Node.js 専用) を配置します。
  - src/content-worker/ に配信 worker (Hono アプリ) を配置します。
- sample/ にコンテンツフォーマットのリファレンス実装と、その定義 (`sample/README.md`) を配置します。
- template/ に hagaki を Cloudflare Workers で動かすテンプレートを配置します。
  - template/tanstack-workers/ - 編集・閲覧 UI (TanStack Start)。ルートは `app/routes/`、共通のコンポーネントは `app/components/`、ライブラリは `app/lib/` に置きます。
  - template/content-worker/ - コンテンツ配信 Worker。
- .github/workflows/ に CI (`ci.yml`) と公開 (`publish.yml`) のワークフローを配置します。
- dist/ はビルドの出力です。手で編集したりコミットしたりしないでください (`.gitignore` 済み)。
