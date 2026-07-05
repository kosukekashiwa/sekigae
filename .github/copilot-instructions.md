# GitHub Copilot Instructions

このファイルは GitHub Copilot（Chat / コーディングエージェント）がこのリポジトリで作業する際の共通指示です。

> **Note**: GitHub Copilot は Claude Code の `@AGENTS.md` のようなインポート構文をサポートしていないため、[AGENTS.md](../AGENTS.md) の内容の一部をこのファイルにも転記しています。**内容を更新する際は両方のファイルを同期させてください。** ブランチ命名・Issue 駆動開発のルールなど、開発ワークフローの詳細は [AGENTS.md の Git Workflow / Boundaries](../AGENTS.md) を正とします。

## Project Overview

「席替えアプリ」は、学校の座席抽選を支援する Next.js (App Router) + TypeScript + React 製の Web アプリです。

- **対象ユーザー**: 生徒の座席を決める教員・担任
- **主要機能**: 生徒一覧の登録・CSV インポート/エクスポート、座席レイアウト設定（列数・行数・座席種別）、座席のランダム抽選・個別指定
- 詳細な機能仕様は [README.md](../README.md) を参照してください。

## Tech Stack

- **Frontend**: Next.js (App Router) / React / TypeScript / Tailwind CSS
- **Backend/API**: 専用のバックエンドサーバー・外部 API 呼び出しはなし。状態は `src/context` の React Context によりクライアント側で完結する。
- **Testing**: 自動テストフレームワークは未導入。`npm run lint` / `npm run build` と、`npm run dev` によるブラウザでの手動確認で品質を担保する。

## Coding Guidelines

- TypeScript の型を明示し、`any` は使わない。
- セミコロン等のフォーマットは ESLint (`eslint-config-next`, `eslint.config.mjs`) の設定に従う（`npm run lint` で確認）。
- ドメインロジック（抽選アルゴリズム、CSV 変換など）は `src/lib` に置き、UI と分離する。
- 既存のファイル・ディレクトリの命名規則に合わせる。
- 自明な内容のコメントは書かない。「なぜ」が非自明な場合のみ最小限のコメントを残す。
- **セキュリティ**: ユーザーがアップロードする CSV（`src/lib/csv.ts`）は信頼できない入力として扱い、パース時のバリデーションを維持・強化する。外部通信や `dangerouslySetInnerHTML` など XSS リスクのある API は使用しない。

## Project Structure

- `src/app`: ページ・ルーティング（Next.js App Router）
- `src/components`: UI コンポーネント（`ConfigPanel`, `Header`, `SeatGrid`, `SeatTile`, `StudentPanel` など）
- `src/context`: アプリ状態管理（React Context, `AppContext.tsx`）
- `src/lib`: 座席抽選・CSV 変換などのドメインロジックと型定義（`seating.ts`, `csv.ts`, `types.ts`）

## Resources

- **開発スクリプト**: `npm run dev`（開発サーバー） / `npm run build`（本番ビルド） / `npm run start`（本番起動確認） / `npm run lint`（ESLint）
- **MCP サーバー**: このリポジトリでは現時点で利用していません。
- **自動化ツール**: `.github/workflows/claude.yml` により、Issue/PR で `@claude` にメンションすると Claude Code が git-flow（base: `develop`）に従って対応します。ブランチ命名・Issue 連携などのルールは [AGENTS.md](../AGENTS.md) を参照してください。
