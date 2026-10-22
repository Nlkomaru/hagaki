# 推奨される書き方

## ライブラリの設計
- コア API (`hagaki`) はフレームワークや認証方式に依存させないでください。認証や権限といったアプリ固有の概念は持たず、コミットの著者だけ `Committer` で受け取ります。
- エディタは headless に保ち、スタイルを持たせないでください。見た目は利用側が `className` で指定します。
- 実行環境 (ブラウザ / Node.js / Workers / どこでも) を entry point ごとに守ってください。ブラウザ専用のコード (エディタ、AVIF エンコード、pending-images) を「どこでも」の entry point から import しないでください。Node.js の API (`fs`, `child_process` など) は CLI (`src/cli/`) でのみ使ってください。
- 配信 worker の型は `@cloudflare/workers-types` に依存させず、必要な形だけを構造的に定義してください (例: `AssetsFetcher`)。

## 依存関係
- `dependencies` / `peerDependencies` に入れたものはバンドルされません (tsdown の既定)。
- `lexical` は利用側の (`@mdxeditor/editor` と同じ) インスタンスを使う必要があるので、必ず external のままにしてください (`deps.neverBundle`)。`@jsquash/avif` も WASM を利用側の node_modules から読むので external のままにしてください。
- React / `@mdxeditor/editor` / `@mdxeditor/gurx` / lexical は optional な peerDependencies です。エディタを使わない利用者が入れなくて済むようにしてください。

## セキュリティ
- コミットするパスはサーバ側で組み立ててください。クライアントが送るファイル名や id は信用せず、記事の `uuid` と各 `imageId` が UUID の形かを確かめてから使ってください (記事の外へ書き込まれるのを防ぐため)。
- アップロードされた画像は `validateAvifUpload` で検証してください。
- 配信 worker は fail-closed にしてください。`slug-index.json` が読めないときは `article/` 配下を配信しません (下書きを漏らさないため)。
- `.npmrc` や `.env` などのトークンを含むファイルの内容を、コードやドキュメント、コミットに含めないでください。

## Test
- 現状、このリポジトリにテストはありません。テストを追加する場合は、あまり大量にせず、関数の主要な分岐点をカバーする程度に留めることが推奨されます。
