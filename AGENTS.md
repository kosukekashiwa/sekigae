# AGENTS.md

このリポジトリで作業する AI コーディングエージェント（GitHub Copilot, Claude Code など）向けの汎用ガイドです。

## プロジェクト概要

「席替えアプリ」（学校の座席抽選 Web アプリ）です。詳細な機能仕様は [README.md](./README.md) を参照してください。

## 技術スタック

- Next.js (App Router) / React / TypeScript
- Tailwind CSS
- ESLint (`eslint-config-next`)

## セットアップ・コマンド

```bash
npm install     # 依存関係のインストール
npm run dev     # 開発サーバー起動
npm run build   # 本番ビルド
npm run lint    # ESLint によるチェック
```

コードを変更した場合は、コミット前に必ず `npm run lint` を実行し、エラーがないことを確認してください。

## ディレクトリ構成

- `src/app`: ページ・ルーティング（App Router）
- `src/components`: UI コンポーネント
- `src/context`: React Context によるアプリ状態管理
- `src/lib`: 座席抽選ロジックや CSV 変換などのドメインロジック・型定義

## コーディング規約

- コンポーネント・関数はすべて TypeScript の型を明示し、`any` を避ける。
- ロジック（抽選アルゴリズムや CSV 変換など）は `src/lib` に置き、UI コンポーネントから分離する。
- 既存のファイル命名・ディレクトリ構成に従う。
- コメントは自明でない意図（なぜそうしているか）がある場合のみ最小限に記述する。

## Issue 駆動開発について

- 作業内容は必ず Issue に紐づけ、Issue番号を PR の説明に記載する。
- Issue の要件が不明確な場合は、実装前に確認・質問する。
- 1つの PR は 1つの Issue に対応するスコープに留める。
- ブランチ運用・PR 作成先は `.github/workflows/claude.yml` の設定（git-flow, base は `develop`）に従う。

## 変更時の確認事項

- `npm run lint` が通ること。
- 既存の UI・座席抽選ロジックの挙動を壊していないこと（README の仕様を参照）。
- 可能であれば `npm run build` が通ることを確認する。
