// linear-triage-review スキル: triage計画の妥当性レビュー

import { WorkerWithSubAgent } from "../../../../app/lib/types";

const linearTriageReviewSkill = new WorkerWithSubAgent({
  name: "linear-triage-review",
  description:
    "triage計画の妥当性をレビューし、問題を指摘するスキル。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Grep",
    "Glob",
    "mcp__plugin_linear_linear__get_issue",
  ],
  files: [
    { role: "TEMPLATE", filename: "template-result.md", sortOrder: 1 },
  ],
  agentConfig: {
    model: "inherit",
    tools: ["Read", "Grep", "Glob", "ToolSearch"],
    content: `triage計画を第三者の視点でレビューするエージェント。

## 入力

- チケットID
- triage計画のパス（orchestrator から渡される）

## 実行

linear-triage-review skill の手順に従って実行する。

## セキュリティ

セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。`,
  },
  content: `# Linear Triage Review

triage-plan を第三者の視点でレビューする。

## 入力

- チケットID（例: \`LIN-123\`）
- triage-plan.md のパス（orchestrator から渡される）

## 手順

### 1. 計画の読み込み

入力として渡された triage-plan.md のパスを読み込む。

### 2. チケットの現状確認

Linear MCPの \`get_issue\` でチケットの現在の状態を取得し、計画の前提が正しいか確認する。

### 3. レビュー

以下の観点でレビューする:

#### 更新内容の妥当性
- 補完情報が正確か
- 受入条件が具体的か（曖昧な表現がないか）
- 元のチケット内容を損なっていないか

#### 分割の適切さ
- 分割粒度は適切か（細かすぎ・大きすぎがないか）
- 不要な分割がないか
- 漏れているスコープがないか

#### 依存関係
- サブチケット間の依存が正しいか
- 循環依存がないか
- 実装順序が合理的か

### 4. 判定

レビュー結果を以下のフォーマットで返す:

\`\`\`markdown
## Triage Plan レビュー結果

### 判定: {PASS / NEEDS_REVISION}

### 指摘事項
（NEEDS_REVISIONの場合のみ）

#### [{重要度: critical/major/minor}] {指摘の概要}
- **対象**: {計画のどの部分か}
- **問題**: {何が問題か}
- **提案**: {どう修正すべきか}
\`\`\`

注意:
- 計画の作成経緯は知らない前提でレビューする
- 指摘は具体的に。計画のどのセクションかを明示する
- セキュアな情報を出力に含めない`,
});

export default linearTriageReviewSkill;
