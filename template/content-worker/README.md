# content-worker (hagaki template の CDN)

`./content/` を Cloudflare Workers Assets で配信する最小構成。
hagaki の `HAGAKI_CDN_BASE_URL` が指す先です。


## ディレクトリ

```
content/
├── wiki/            # 記事の Markdown (frontmatter 必須)
├── categories/      # カテゴリ JSON
├── img/             # 画像
├── wiki.json        # ← scripts/generate-lists.ts が生成
├── categories.json  # ← 同上
└── img.json         # ← 同上
```

`*.json` のインデックスファイルは git 管理外。デプロイ前に必ず
`pnpm generate` で作り直すこと。

## 配信される URL

例: `https://content-hagaki.nikomaru.workers.dev/wiki.json`

| パス | 内容 |
|---|---|
| `/wiki.json` | 記事一覧 (`hagaki.posts.list()` が読む) |
| `/wiki/<slug>.md` | 個別記事 (`hagaki.posts.getBySlug()` が読む) |
| `/categories.json` | カテゴリ一覧 |
| `/img.json` | 画像ファイル名一覧 |
| `/img/<filename>` | 画像本体 |

## コマンド

```sh
# 依存をインストール (workspace ルートで)
pnpm install

# wiki.json などのインデックスを生成
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
