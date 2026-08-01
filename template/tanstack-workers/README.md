# hagaki-template / tanstack-workers

TanStack Start + Cloudflare Workers + [hagaki](../../) を使ったフロント
テンプレート。記事の配信元は隣の [`../content-worker`](../content-worker)。

## 含まれる機能

- TanStack Router / Start / Query / Router SSR Query
- `hagaki.posts.list()` を server function で呼び出す `/posts` 一覧
- `HagakiEditor` (MDXEditor ラッパ) を埋め込んだ `/posts/$slug/edit` 編集画面
- 保存は server function 経由で `hagaki.posts.save()`
- Cloudflare Workers にそのままデプロイ可能 (`@cloudflare/vite-plugin`)

## セットアップ

1. リポジトリ ルートで依存をインストール:

   ```sh
   pnpm install
   ```

2. content-worker をデプロイして CDN URL を取得 (先に
   [`../content-worker/README.md`](../content-worker/README.md) を参照):

   ```sh
   pnpm --filter hagaki-template-content deploy
   ```

3. `.env` と `.dev.vars` の両方を作成 (どちらも同じ内容で OK):

   ```sh
   cp .env.example .env
   cp .env .dev.vars
   ```

   ```sh
   HAGAKI_GITHUB_OWNER=your-org
   HAGAKI_GITHUB_REPO=your-content-repo
   HAGAKI_GITHUB_TOKEN=ghp_xxx
   HAGAKI_CDN_BASE_URL=https://content-hagaki.<your-subdomain>.workers.dev
   # 任意
   HAGAKI_GITHUB_BRANCH=main
   HAGAKI_GITHUB_CONTENT_PATH=content/article
   ```

   - **`.env`** はビルド時 (`vite build` / `wrangler deploy`) に拾われる
   - **`.dev.vars`** は dev サーバ (miniflare) がランタイムで読む
   - 値を変更したら両方を更新 (もしくは `cp .env .dev.vars`)

4. 開発サーバを起動 (`vite dev` 経由、Cloudflare Workers エミュレーション付き):

   ```sh
   pnpm --filter hagaki-template-tanstack-workers dev
   ```

## Cloudflare Workers にデプロイ

1. 一度だけ `wrangler login`
2. `wrangler.jsonc` の `name` を好みに変更 (現在: `hagaki-template`)
3. プロダクション用に secret を登録:

   ```sh
   cd template/tanstack-workers
   pnpm exec wrangler secret put HAGAKI_GITHUB_TOKEN
   pnpm exec wrangler secret put HAGAKI_GITHUB_OWNER
   pnpm exec wrangler secret put HAGAKI_GITHUB_REPO
   pnpm exec wrangler secret put HAGAKI_CDN_BASE_URL
   # 任意: HAGAKI_GITHUB_BRANCH, HAGAKI_GITHUB_CONTENT_PATH
   ```

   非機密の値であれば `wrangler.jsonc` の `vars` に書いてもよい。

4. ビルド & デプロイ:

   ```sh
   pnpm --filter hagaki-template-tanstack-workers deploy
   ```

## GitHub トークンの作り方

`HAGAKI_GITHUB_TOKEN` には、`HAGAKI_GITHUB_REPO` への読み書き権限を持つ
トークンを設定します。**Fine-grained personal access token** を推奨。

### Fine-grained PAT (推奨)

1. <https://github.com/settings/personal-access-tokens/new> を開く
2. **Token name** 任意 (例: `hagaki-local`)
3. **Expiration** 用途に合わせて (個人開発なら 90 日くらい)
4. **Repository access** → *Only select repositories* で
   `HAGAKI_GITHUB_OWNER/HAGAKI_GITHUB_REPO` を選択
5. **Repository permissions** で以下を `Read and write` に設定:
   - **Contents** — 記事 (`.md`) の取得・更新に必須
   - **Metadata** (自動で Read-only が付く)
6. その他のスコープはオフのままで OK
7. **Generate token** を押し、`ghp_...` を `.env` の
   `HAGAKI_GITHUB_TOKEN` に貼り付ける

組織リポジトリを対象にする場合、組織側で fine-grained PAT が
許可されている必要があります (Organization settings → Personal access
tokens)。許可されていない場合は組織管理者に申請するか、下の classic PAT で
代替してください。

### Classic PAT (組織制限で fine-grained が使えない場合のフォールバック)

1. <https://github.com/settings/tokens/new> を開く
2. **Note** 任意, **Expiration** 用途に合わせて
3. **Select scopes**:
   - private repo の場合: `repo` (フル)
   - public repo のみの場合: `public_repo` だけで十分
4. **Generate token** を押して貼り付け

### 動作確認

`.env` を保存したら `pnpm --filter hagaki-template-tanstack-workers dev`
を再起動して、`/posts` 一覧と `/posts/<slug>/edit` の保存ボタンが
動くことを確認してください。
保存時に 401 / 403 が返るときはトークンのスコープか repository access を
見直します。

## このテンプレートを外に持ち出す

外部にコピーして使う場合は次を変更してください:

- `package.json` の `"hagaki": "workspace:*"` を公開バージョン
  (`"hagaki": "^0.1.0"` 等) に書き換える
- `biome.json` の `"root": false` と `"extends": "//"` を削除して
  単独設定にする (親リポジトリの biome 設定を継承していたため)
