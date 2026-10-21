# tanstack-workers (hagaki template)

TanStack Start + Cloudflare Workers + [hagaki](../../) の編集・閲覧 UI。
記事の配信元は隣の [`../content-worker`](../content-worker)。

- `/posts`: `hagaki.posts.list()` で記事一覧
- `/posts/$slug/edit`: `HagakiEditor` での編集。保存は server function から本文と画像を 1 コミットで GitHub へ
- 認証は better-auth + MineAuth (OIDC, PKCE)。DB は持たない

## 構成

| ファイル | 内容 |
|---|---|
| `cloudflare.config.ts` | Worker の定義。公開してよい設定値 (`HAGAKI_*`, `CLIENT_ID` など) と secret の宣言 |
| `vite.config.ts` | Vite + `@cloudflare/vite-plugin` (beta)。cf はこれでビルドする |
| `app/lib/post-editor-images.ts` | 画像の挿入とプレビュー、保存時の画像収集 (`hagaki/pending-images`) |
| `app/lib/post-editor-server.ts` | 保存用の server function。画像を検証して本文と一緒にコミットする |

画像は保存までブラウザのメモリ (`Blob`) に置き、プレビューは object URL で出す。
一時置き場のストレージ (R2 など) は使わない。

## 設定

公開してよい値は `cloudflare.config.ts` の `env` に書く
(`HAGAKI_CDN_BASE_URL` は content-worker の URL に合わせる)。
secret は 2 つある。

| secret | 内容 |
|---|---|
| `HAGAKI_GITHUB_TOKEN` | コンテンツリポジトリの Contents を Read and write できる fine-grained PAT |
| `AUTH_SECRET` | better-auth の暗号鍵 (`openssl rand -base64 32` など) |

ローカルでは `.dev.vars` に書く。

```sh
cp .dev.vars.example .dev.vars
```

本番では `cf deploy --secrets-file <file>` で渡すか、ダッシュボードで設定する。

## ローカル開発

```sh
pnpm install
pnpm run dev        # cf dev (Vite)
pnpm run typecheck  # cf workers types && tsc
```

## deploy

`.env` (git 管理外) に Cloudflare の認証情報を入れる。cf は `.env` から
`CLOUDFLARE_*` を読む。

```sh
cp .env.example .env   # CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN を埋める
pnpm exec cf build
pnpm exec cf deploy --prebuilt --mode production
```

配信 URL は `https://hagaki-template.<subdomain>.workers.dev`。
MineAuth には `<origin>/api/auth/callback/MineAuth` を redirect URI として登録する。

## 外に持ち出すとき

- `package.json` の `"hagaki": "workspace:*"` を `"github:Nlkomaru/hagaki#dist"` にする
- `biome.json` の `"root": false` と `"extends": "//"` を消して単独の設定にする
