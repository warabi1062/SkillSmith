# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

SkillSmith は、Claude Code のスキル設計パターンをスキーマとして形式化し、GUI上でスキルを組み立てることで設計の一貫性を構造的に保証するツール。Orchestrator + Worker skill + Agent のパターンに沿ったプラグインのみを生成する。

**ステータス**: 開発中（v1.0.0）

## コーディング規約

- コード内のコメント文は日本語で書くこと

## 開発コマンド

- パッケージマネージャ: `pnpm@10.33.0`（必須）
- `pnpm install` で依存関係をインストール
- `pnpm dev` - 開発サーバー起動（`packages/web` の React Router dev）
- `pnpm build` - プロダクションビルド（`pnpm -r build` で全パッケージ）
- `pnpm typecheck` - TypeScript型チェック（`pnpm -r typecheck`）
- `pnpm lint` - Lint実行（oxlint）
- `pnpm format` - フォーマット（Biome）
- `pnpm cli` - CLIの直接実行（`tsx packages/cli/src/index.ts`）
- `pnpm cli plugin export {plugin.ts-path} --output {output-dir}` - 単一プラグインのエクスポート
- `pnpm cli marketplace export {marketplace-dir} --output {output-dir}` - マーケットプレース一括エクスポート
- `pnpm cli web` - ローカルの `marketplaces/` ディレクトリをブラウザで閲覧する Web ビューアーを起動（`@warabi1062/skillsmith-viewer` が optional peer としてインストールされている必要あり。外部ユーザーは `skillsmith web` として実行）
- `pnpm changeset` - 変更内容に対する changeset ファイルを追加
- `pnpm version-packages` - changeset を消費して各パッケージのバージョン・CHANGELOG を更新（内部で `changeset version`）
- `pnpm release` - 全パッケージを build してから npm に publish（内部で `pnpm -r build && changeset publish`）

## アーキテクチャ

### 3つのレイヤー

SkillSmith は pnpm workspaces による monorepo 構成で、`packages/` 配下に 3 パッケージ（`@warabi1062/skillsmith-viewer` / `@warabi1062/skillsmith-core` / `@warabi1062/skillsmith`（CLI））を持つ。役割としては **Web UI** / **生成エンジン** / **CLI** の3層で構成される。

1. **Web UI**（`packages/web/app/routes/`）: React Router v7。プラグイン定義の閲覧・オーケストレーター構造の可視化
2. **生成エンジン**（`packages/core/src/`）: TypeScriptのスキル定義 → Markdownベースのプラグインファイルへの変換パイプライン
3. **CLI**（`packages/cli/src/`）: `skillsmith plugin export` コマンドでプラグインをファイルシステムに出力

### データフロー（生成パイプライン）

```
plugin.ts（TypeScriptスキル定義）
  ↓ packages/core/src/loader/loader.server.ts（jiti で動的読み込み）
LoadedPluginDefinition（型付き・内容解決済み）
  ↓ packages/core/src/generator/plugin-generator.server.ts（各スキル種別ごとに委譲）
  │  ├→ skill-generator（SKILL.md frontmatter + content）
  │  ├→ orchestrator-content-generator（EntryPoint: steps→markdown）
  │  ├→ worker-content-generator / agent-content-generator（Worker系）
  │  ├→ team-content-generator（AgentTeam系）
  │  └→ file-generator（サポートファイルコピー）
GeneratedPlugin（GeneratedFile[] + バリデーションエラー）
  ↓ packages/core/src/exporter/exporter.server.ts（一時ディレクトリ→ターゲットへ2段階書き出し）
ファイルシステム出力
```

### スキル型の階層

`packages/core/src/types/skill.ts` に定義された抽象基底クラス `Skill` から4つの具象型が派生する。スキル種別（`skillType`）がDiscriminated Unionのキーとなり、生成パイプラインの分岐を制御する。

| 型 | skillType | 生成物 |
|---|---|---|
| `EntryPointSkill` | `ENTRY_POINT` | SKILL.md（自動生成オーケストレーション） |
| `WorkerSkill` | `WORKER` | SKILL.md のみ |
| `WorkerWithSubAgent` | `WORKER_WITH_SUB_AGENT` | SKILL.md + agent.md |
| `WorkerWithAgentTeam` | `WORKER_WITH_AGENT_TEAM` | SKILL.md + TeamCreate指示 |

### マーケットプレースとプラグイン定義の書き方

プラグインは `packages/web/marketplaces/{marketplace}/plugins/{name}/plugin.ts` に `PluginDefinition` を default export する。各スキルは上記4型のいずれかのインスタンスで、`steps[]`・`sections[]`・`ToolRef`（`tool()`, `bash()`, `mcp()`）を組み合わせて定義する。実例は `packages/web/marketplaces/example/plugins/` を参照。

マーケットプレースは複数のプラグインをまとめた配布単位で、`marketplace export` コマンドで外部リポジトリに一括出力する。

### コア設計パターン: Orchestrator中心 + ファイルベース契約

1. **Orchestrator（Entry-point skill）** がワークフロー全体を管理し、各ステップでSub Agentを `Task(subagent_type: ...)` で起動
2. **Worker skill** が専門タスクを担当。必ず対応する Agent を作成し、Agent の `skills:` でプリロード
3. **Sub Agent** の成果物はワークフローファイル（`~/.claude/workflows/{task-id}/`）に保存し、**ファイルパスのみ**をOrchestratorに返す
4. Orchestratorがパスを中継し、次のAgentに渡す（読み込む側はファイル名を知らない）

**重要な制約**: Sub Agentは更にSub Agentを生成できない。そのためオーケストレーター型Entry-pointは必ずSkillとして作成する（Agentにしない）。

### スキルの3分類

| 種類 | 役割 | 例 |
|------|------|-----|
| Entry-point skill | ユーザーが `/skill-name` で呼び出す | `dev`, `review-pr` |
| Worker skill | オーケストレーターの1ステップを担当 | `implement`, `create-pr` |
| Cross-cutting skill | CLAUDE.mdからグローバル注入される横断的関心事 | `slack-notify`, `memory-manager` |

### Skill と Agent の役割分離

- **Skill** = 手順・知識の定義（What）。SKILL.md + サポートファイル群
- **Agent** = 実行環境・振る舞いの定義（How）。単一mdファイル、末尾に `-agent` を付ける命名規約
- Agent本文にはskillの手順を転記しない。`skills:` でプリロードし、agent固有の制約のみ記述

## テスト

- フレームワーク: Vitest
- 実行: `pnpm test`（単発）/ `pnpm test:watch`（ウォッチ）/ `pnpm test:coverage`（カバレッジ）
- 単一ファイル実行: `pnpm test -- packages/core/src/generator/__tests__/skill-generator.test.ts`
- 配置: 対象モジュールと同階層の `__tests__/` ディレクトリに `*.test.ts(x)` として作成
- 対象パターン: `packages/web/app/**/__tests__/**/*.test.{ts,tsx}`, `packages/core/src/**/__tests__/**/*.test.{ts,tsx}`, `packages/cli/src/**/__tests__/**/*.test.ts`

### テストを書くべきケース

- **ビジネスロジック・ドメインルール**: バリデーション、データ変換、生成ロジックなど。入力と出力が明確で、壊れると影響が大きい
- **複雑な条件分岐**: 分岐が3つ以上あるロジック、エッジケースが存在する処理
- **回帰防止が必要な箇所**: 過去にバグが発生した、または壊れやすいと分かっている処理

### テストを書かなくてよいケース

- **単純なCRUDの薄いラッパー**: Prismaへの委譲だけで分岐もないもの
- **UIのスタイリング・レイアウト**: 見た目の確認は目視で十分
- **外部ライブラリの動作確認**: ライブラリ側でテスト済みの振る舞い
- **設定ファイル・定数定義**: 壊れようがないもの

### テスト作成の原則

- テストは「仕様の記述」。何が正しい振る舞いかを示す
- 実装の内部構造ではなく、入力→出力の契約をテストする
- モックは外部依存（DB、API）に限定し、テスト対象のロジック自体はモックしない
- テスト名は日本語で、期待する振る舞いを記述する（例: `"無効なplugin名でエラーを返す"`）

## ドキュメント

- [docs/reference.md](docs/reference.md) - プラグイン作成リファレンス（スキル/エージェントの設計パターン、frontmatterフィールド、アンチパターン、設計チェックリスト）
- [docs/tool-design.md](docs/tool-design.md) - SkillSmith のツール設計（reference.md のパターンをツールに落とし込む際の設計判断。データモデル、依存関係管理、分類の簡略化など）
