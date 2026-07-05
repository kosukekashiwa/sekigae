# GitHub Copilot Instructions

このファイルは GitHub Copilot（Chat / コーディングエージェント）がこのリポジトリで作業する際の共通指示です。詳細は [AGENTS.md](../AGENTS.md) を参照してください。

## プロジェクト概要

学校の座席抽選を支援する Next.js (App Router) + TypeScript + React 製の Web アプリです。仕様は [README.md](../README.md) を参照してください。

## 開発コマンド

```bash
npm install
npm run dev     # 開発サーバー
npm run build   # 本番ビルド
npm run lint    # ESLint
```

コードを変更したら、必ず `npm run lint` を実行してエラーがないことを確認してください。

## ディレクトリ構成

- `src/app`: ページ・ルーティング
- `src/components`: UI コンポーネント
- `src/context`: アプリ状態管理（React Context）
- `src/lib`: 座席抽選・CSV 変換などのドメインロジックと型定義

## コーディング方針

- TypeScript の型を明示し、`any` は使わない。
- ドメインロジック（抽選アルゴリズム、CSV 変換など）は `src/lib` に置き、UI と分離する。
- 既存のファイル・ディレクトリの命名規則に合わせる。
- 自明な内容のコメントは書かない。「なぜ」が非自明な場合のみ最小限のコメントを残す。

## Issue駆動開発のルール

- 実装は必ず対応する Issue の内容に基づいて行い、要件が不明な場合は実装前に質問する。
- 1つの変更（PR）は1つの Issue のスコープに留める。
- ブランチは `develop` から作成し、`feature/<説明>` または `fix/<説明>` の命名規則に従う（`.github/workflows/claude.yml` 参照）。
- PR は `develop` ブランチに向けて作成し、対応する Issue 番号を説明に含める。
- コミット前に `npm run lint` を実行し、可能であれば `npm run build` も確認する。
