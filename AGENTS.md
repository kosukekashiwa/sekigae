# AGENTS.md

このリポジトリで作業する AI コーディングエージェント（GitHub Copilot, Claude Code など）向けの汎用ガイドです。

> **Note**: GitHub Copilot は Claude Code の `@AGENTS.md` のようなインポート構文をサポートしていないため、プロジェクト概要・技術スタック・コーディング規約は [.github/copilot-instructions.md](./.github/copilot-instructions.md) にも転記しています。**内容を更新する際は両方のファイルを同期させてください。**

## Project Overview

「席替えアプリ」は、学校の座席抽選を支援する Web アプリです。詳細な機能仕様は [README.md](./README.md) を参照してください。

## Commands

```bash
npm install     # 依存関係のインストール
npm run dev     # 開発サーバー起動 (http://localhost:3000)
npm run build   # 本番ビルド
npm run start   # 本番ビルドの起動確認
npm run lint    # ESLint によるチェック（設定: eslint.config.mjs）
```

コードを変更した場合は、コミット前に必ず `npm run lint` を実行し、エラーがないことを確認してください。可能であれば `npm run build` も実行してください。

## Testing

現時点でこのリポジトリに自動テストスイート（Jest/Vitest 等）は導入されていません。

- 変更内容は `npm run lint` と `npm run build` に加え、`npm run dev` でアプリを起動し該当機能をブラウザで手動確認してください。
- 座席抽選ロジック（`src/lib/seating.ts`）など重要なロジックを変更する場合は、README.md の「抽選ルール」に記載された仕様との整合性を必ず確認してください。
- 自動テストを新規導入した場合は、このセクションを実態に合わせて更新してください。

## Project Structure

- `src/app`: ページ・ルーティング（Next.js App Router）
- `src/components`: UI コンポーネント（`ConfigPanel`, `Header`, `SeatGrid`, `SeatTile`, `StudentPanel` など）
- `src/context`: `AppContext` による React Context ベースのアプリ状態管理
- `src/lib`: 座席抽選ロジック（`seating.ts`）、CSV 変換（`csv.ts`）、型定義（`types.ts`）などのドメインロジック

## Code Style

- コンポーネント・関数はすべて TypeScript の型を明示し、`any` を避ける。
- ロジック（抽選アルゴリズムや CSV 変換など）は `src/lib` に置き、UI コンポーネントから分離する。
- 既存のファイル命名・ディレクトリ構成に従う（コンポーネントは `PascalCase.tsx`、ロジックは `camelCase.ts`）。
- コメントは自明でない意図（なぜそうしているか）がある場合のみ最小限に記述する。

Good:

```ts
function drawSeat(student: Student, seats: Seat[]): Seat | null {
  // ...
}
```

Bad:

```ts
function drawSeat(student: any, seats: any[]): any {
  // any を使うと型チェックの恩恵が失われる
}
```

## Git Workflow

- ブランチ運用は git-flow に従い、base は `develop`（`.github/workflows/claude.yml` 参照）。
- ブランチ命名: `feature/<説明>`（新機能）、`fix/<説明>`（バグ修正）、`hotfix/<説明>`（緊急修正）。
- 作業内容は必ず Issue に紐づけ、Issue 番号を PR の説明に記載する（例: `Closes #35`）。
- 1つの PR は 1つの Issue に対応するスコープに留める。
- Issue の要件が不明確な場合は、実装前に確認・質問する。

## Boundaries

**Always**

- コード変更前後に `npm run lint` を実行し、エラーがないことを確認する。
- 座席抽選ロジックなど既存の仕様（README.md 参照）を壊していないか確認する。
- Issue 番号を PR 説明に含める。

**Ask First**

- Issue の要件が不明確・複数解釈可能な場合。
- 依存パッケージの追加・更新。
- 既存の抽選アルゴリズムやデータ構造（CSV フォーマット等）に影響する破壊的変更。

**Never**

- `main` や `develop` に直接コミットする。
- `.github/workflows` 配下のファイルを変更する（権限上不可）。
- Issue に紐づかない無関係な変更を同じ PR に混在させる。
