// plan-implementation スキル: チケット要件に基づくコードベース調査と実装計画作成

import { WorkerWithSubAgent } from "../../../../app/lib/types";

const planImplementationSkill = new WorkerWithSubAgent({
  name: "plan-implementation",
  description:
    "チケットの要件に基づきコードベースを調査して具体的な実装計画を立てるスキル。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Grep",
    "Glob",
    "Write",
    "Task",
    "ToolSearch",
    "mcp__plugin_linear_linear__get_issue",
    "mcp__ide__getDiagnostics",
  ],
  files: [
    { role: "TEMPLATE", filename: "template.md", sortOrder: 1 },
  ],
  agentConfig: {
    model: "inherit",
    tools: ["Read", "Grep", "Glob", "Write", "ToolSearch"],
    content: `チケットの要件に基づいてコードベースを調査し、実装計画を作成するエージェント。

## 入力

- チケットID
- 事前調査ファイルのパス（orchestrator から渡される、任意）:
  - triage結果のパス
  - Sentry調査結果のパス

## 出力

- 実装計画の保存先パス

## 実行

plan-implementation skill の手順に従って実行する。

- ユーザー承認はこのagentでは行わない。計画作成までを担当し、承認はメイン（dev skill）で行う

## セキュリティ

セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。`,
  },
  content: `# Plan Implementation

チケットの要件に基づいて、コードベースを調査し、具体的な実装計画を立てる。

## 入力

- チケットID（例: \`LIN-123\`）。チケットは1PR粒度であること
- 事前調査ファイルのパス（orchestrator から渡される、任意）:
  - triage-result.md のパス
  - sentry-investigation.md のパス

## 手順

### 0. 事前調査の読み込み

入力として渡された事前調査ファイルのパスを読み込み、事前調査の結果を把握する。パスが渡されなかったファイルは読み込まない。

### 1. 要件確認

Linear MCPの \`get_issue\` でチケットの最新内容を取得し、実装要件を整理する:
- 何を実現するか（ゴール）
- 受入条件の一覧
- 制約・注意事項

### 2. コードベース調査

事前調査にバグ再現の情報が含まれる場合: 既に特定された関連コード・原因仮説を起点に調査を進める。

Explore agentを使い、以下を調査する:
- チケットに関連する既存コード（ファイルパス・関数名を特定）
- 既存の設計パターン・命名規則・ディレクトリ構造
- 関連するテストの構造・テストフレームワーク
- 依存関係（変更が影響するコード）
- プロジェクトの \`.claude/skills/\` に関連スキルがあるか（スクリーンショット、テスト、デプロイ等）

### 3. 実装計画の作成

調査結果をもとに、[template.md](template.md) のフォーマットで実装計画を作成する。

### 4. ユーザー承認

実装計画をユーザーに提示し、承認を得る。
フィードバックがあれば計画を修正する。

### 5. 計画の保存

承認された計画を \`~/claude-code-data/workflows/{チケットID}/plan.md\` に保存する。

### 6. 結果返却

計画の概要に加え、plan.md の保存先パスを返す。`,
});

export default planImplementationSkill;
