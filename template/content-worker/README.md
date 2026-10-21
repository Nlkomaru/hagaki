# content-worker (hagaki template)

`./content/` を Workers Static Assets で配信する最小構成。hagaki の
`HAGAKI_CDN_BASE_URL` が指す先になる。下書き記事は `hagaki/content-worker`
が 404 にする。

## 構成

```
cloudflare.config.ts   # Worker の定義 (名前、workers.dev、ASSETS binding、runWorkerFirst)
wrangler.config.ts     # cf build / cf dev が使う Wrangler bundler の設定 (build.command = hagaki generate, assetsDirectory)
src/index.ts           # createContentApp() — 下書きの遮断だけを担当
content/
├── article/<uuid>/
│   ├── index.mdx      # 記事本体 (frontmatter 必須: slug, uuid)
│   ├── info.json      # ← hagaki generate が生成 (履歴マージ済みメタデータ)
│   └── assets/        # その記事の画像 (<imageId>.avif)
├── categories/        # カテゴリ JSON
├── article.json       # ← hagaki generate が生成
├── slug-index.json    # ← 同上 (slug → uuid)
└── categories.json    # ← 同上
```

生成物の `*.json` は git 管理外。`cf dev` / `cf build` が `wrangler.config.ts` の
`build.command` で毎回 `hagaki generate` を実行する (単体で作るなら `pnpm run generate`)。`info.json` の履歴は frontmatter の
`modified` と git のコミット履歴をマージしたものなので、浅い clone では git の分が欠ける。

配信 URL は `https://hagaki-content.<subdomain>.workers.dev`
(`<subdomain>` はアカウントの workers.dev サブドメイン)。

| パス | 内容 |
|---|---|
| `/article.json` | 記事一覧 (`hagaki.posts.list()`) |
| `/slug-index.json` | slug → uuid |
| `/article/<uuid>/index.mdx` | 記事本体 (`getBySlug()` / `getByUuid()`) |
| `/article/<uuid>/info.json` | 記事メタデータ |
| `/article/<uuid>/assets/<file>` | 記事の画像 |
| `/categories.json` | カテゴリ一覧 |

## ローカル開発

Node.js 26.12 以上 (`.node-version`) と pnpm 12 (`packageManager`) を使う。

```sh
pnpm install
pnpm exec cf dev    # hagaki generate → cf dev
```

## deploy

### 初回セットアップ

`.env` (git 管理外) に Cloudflare の認証情報を入れる。cf は `.env` から
`CLOUDFLARE_*` を読む。

```sh
cp .env.example .env   # CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN を埋める
# 同じ値を GitHub secrets にも入れる
gh secret set -f .env
```

### GitHub Actions

`.github/workflows/deploy.yml` が PR / main への push / 手動実行でビルドと dry-run を行い、
main への push のときだけ本番に deploy する。

### 手動

```sh
pnpm exec cf build --mode production   # hagaki generate を含む
pnpm exec cf deploy --prebuilt --mode production
```
