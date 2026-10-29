# hagaki templates

hagaki を Cloudflare Workers で動かすためのテンプレート。設定は cf
(`cloudflare.config.ts`) 前提で、workers.dev に配信する。

```
template/
├── tanstack-workers/   # 編集・閲覧 UI (TanStack Start + Vite)
└── content-worker/     # コンテンツ配信 (content/ を Static Assets で配信)
```

| ディレクトリ | 役割 |
|---|---|
| [`tanstack-workers/`](./tanstack-workers/) | 編集 UI と server function を持つ TanStack Start アプリ。記事を `hagaki.posts.list()` で読み、保存時は本文と画像を 1 コミットで GitHub に書く |
| [`content-worker/`](./content-worker/) | `hagaki generate` の生成物と記事を配信する Worker。`HAGAKI_CDN_BASE_URL` の向き先 |

## 流れ

1. 編集者が `tanstack-workers` のエディタで記事を書く。画像は保存までブラウザのメモリに置かれる
2. 保存すると、本文と画像が GitHub のコンテンツリポジトリに 1 コミットで入る
3. コンテンツリポジトリの Actions が `hagaki generate` → `cf deploy` で配信を更新する

## 使い方 (この workspace 内)

```sh
pnpm install
pnpm run build                                    # hagaki 本体 (workspace:* で参照)
pnpm --filter hagaki-template-content dev         # http://localhost:8787
pnpm --filter hagaki-template-tanstack-workers dev
```

deploy の手順はそれぞれの README を参照。外に持ち出すときは
`"@morinoparty/hagaki": "workspace:*"` を公開版 (`"^0.2.0"` など) に書き換える。公開版は npm にあるので `.npmrc` の設定は要らない。
