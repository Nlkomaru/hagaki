# content-worker (hagaki template の CDN)

`./content/` を Cloudflare Workers Assets で配信する最小構成。
hagaki の `HAGAKI_CDN_BASE_URL` が指す先です。


## ディレクトリ

```
content/
├── article/                  # 記事ごとのディレクトリ (uuid 名)
│   └── <uuid>/
│       ├── index.mdx         #   記事本体 (frontmatter 必須: slug, uuid)
│       ├── info.json         #   ← hagaki generate が生成 (履歴マージ済みメタデータ)
│       └── assets/<file>     #   その記事専用の画像
├── categories/               # カテゴリ JSON
├── article.json              # ← hagaki generate が生成
├── slug-index.json           # ← 同上 (slug → uuid)
└── categories.json           # ← 同上
```

生成される `*.json` は git 管理外。デプロイ前に必ず `pnpm generate` で
作り直すこと (`.github/workflows/deploy.yml` は push 時にこれを自動で行う)。
`info.json` の履歴は frontmatter の `modified` (移行元の履歴) と git の
コミット履歴をマージしたもの — 浅い clone では git 分が欠けるので注意。

旧 `wiki/` + `img/` レイアウトからの移行は `pnpm migrate`
(`scripts/migrate-to-article.ts`) で行えます。

## 配信される URL

例: `https://content-hagaki.nikomaru.workers.dev/article.json`

| パス | 内容 |
|---|---|
| `/article.json` | 記事一覧 (`hagaki.posts.list()` が読む) |
| `/slug-index.json` | slug → uuid マップ (`getPostBySlug` の O(1) 解決用) |
| `/article/<uuid>/index.mdx` | 個別記事 (`hagaki.posts.getBySlug()` / `getByUuid()` が読む) |
| `/article/<uuid>/info.json` | 記事メタデータ (履歴マージ済み) |
| `/article/<uuid>/assets/<filename>` | その記事の画像本体 |
| `/categories.json` | カテゴリ一覧 |

## コマンド

```sh
# 依存をインストール (workspace ルートで)
pnpm install

# article.json などのインデックスを生成
pnpm --filter hagaki-template-content generate

# ローカル開発 (http://localhost:8787)
pnpm --filter hagaki-template-content dev

# Cloudflare にデプロイ
pnpm --filter hagaki-template-content deploy
```

## 初回デプロイ手順

1. `wrangler login` で Cloudflare に認証
2. `wrangler.jsonc` の `name` が好みでなければ書き換え (現在: `content-hagaki`)
3. `pnpm --filter hagaki-template-content deploy`
4. 表示された `<name>.<your-subdomain>.workers.dev` を控える
5. `template/.env` の `HAGAKI_CDN_BASE_URL` をその URL に設定

## 書き込みフロー

template の `/posts/<slug>/edit` で保存すると、`hagaki.posts.save()` が
GitHub の content リポジトリ (`HAGAKI_GITHUB_REPO`) に直接コミットします。
そのコミットがマージされたら、

```sh
pnpm --filter hagaki-template-content generate
pnpm --filter hagaki-template-content deploy
```

で worker 側にも反映します (CI で自動化することも可能)。
