# hagaki templates

hagaki を Cloudflare Workers 上で動かすための一式テンプレート。

## 構成

```
template/
├── tanstack-workers/   # フロント (TanStack Start + Cloudflare Workers)
└── content-worker/     # CDN (Cloudflare Workers Assets で content/ を配信)
```

| ディレクトリ | 役割 |
|---|---|
| [`tanstack-workers/`](./tanstack-workers/) | 編集 UI と server function を持つ TanStack Start アプリ。`hagaki.posts.list()` で記事を取得、`hagaki.posts.save()` で GitHub にコミット |
| [`content-worker/`](./content-worker/) | Markdown とインデックス JSON を公開する Cloudflare Worker。`HAGAKI_CDN_BASE_URL` が指す先 |

## 想定フロー

1. 編集者は **`tanstack-workers`** のエディタ画面で記事を書く
2. 保存すると `hagaki` が **GitHub の content リポジトリ** に直接コミット
3. CI または手動で `content-worker` をデプロイ → 公開 CDN に反映

## 初回セットアップ (要約)

```sh
# 1. workspace 依存をインストール
pnpm install

# 2. content-worker をデプロイ
pnpm --filter hagaki-template-content deploy
# → 表示された URL を控えておく

# 3. tanstack-workers の .env を設定
cd template/tanstack-workers
cp .env.example .env
# HAGAKI_CDN_BASE_URL に 2. の URL を入れる

# 4. 開発サーバ
pnpm --filter hagaki-template-tanstack-workers dev
```

詳細はそれぞれの README.md を参照してください。
