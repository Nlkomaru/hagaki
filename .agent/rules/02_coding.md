# コーディングプラクティス

## 実装手順

1. **型設計**
   - まず型(interface)を定義

2. **純粋関数から実装**
   - 外部依存のない関数を先に実装

## プラクティス

- 小さく始めて段階的に拡張
- 過度な抽象化を避ける
- コードよりも型を重視
- 複雑さに応じてアプローチを調整



## コードスタイル

- 常に既存コードの設計や記法を参考にしてください。
- 書籍「リーダブルコード」のようなベストプラクティスを常に適用してください。
- コードの意図・背景などのコメントを積極的に入れてください。公開する関数・型には TSDoc (`/** ... */`) を書いてください。既存コードのコメントは英語なので、それに合わせてください。
- フォーマットと lint は Biome に従います (インデントはスペース 4、1 行 80 文字、ダブルクォート)。`console.log` は禁止で、`console.warn` / `console.error` / `console.info` のみ使えます。
- 相対 import には `.js` 拡張子を付けてください (例: `import { createHagakiClient } from "./api/client.js";`)。
- パッケージマネージャーは pnpm を使ってください。npm / npx は使わず、`pnpm exec` / `pnpm dlx` を使ってください。
- コードを書いた後は、`pnpm run typecheck && pnpm run check:ci && pnpm run build` を実行して、型チェック・Biome のチェック・ビルドが通ることを確認してください (CI の `.github/workflows/ci.yml` と同じ内容です)。
  - Biome の指摘を自動で直す場合は `pnpm run check` (書き込みあり) を使ってください。

## 補足

- テンプレート (`template/*`) は hagaki を `workspace:*` で参照するので、テンプレートで本体の変更を確認する場合は先にルートで `pnpm run build` を実行して `dist/` を更新してください。
- テンプレートの `dev` / `build` / `deploy` (`cf dev` / `cf build` / `cf deploy`) は、ユーザーに指示されない限り実行しないでください。
