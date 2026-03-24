// plan-team スキル: Agent Teamでplanner/reviewerを編成し、実装計画の作成とレビューを並列で行う

import { WorkerWithAgentTeam } from "../../../../app/lib/types";

const planTeamSkill = new WorkerWithAgentTeam({
  name: "plan-team",
  description:
    "Agent Teamでplanner/reviewerを編成し、実装計画の作成とレビューを並列で行う。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Write",
    "Glob",
    "Grep",
    "Bash",
    "Task",
    "AskUserQuestion",
    "ToolSearch",
  ],
  files: [
    { role: "TEMPLATE", filename: "template.md", sortOrder: 1 },
  ],
  agentTeamMembers: [
    { skillName: "planner", sortOrder: 1 },
    { skillName: "reviewer", sortOrder: 2 },
  ],
  content: `# Plan Team

Agent Team を使い、planner と reviewer の2名体制で実装計画の作成・レビューを行う。
このスキルはメインエージェントがリーダーとして直接実行する。

## 入力

- タスクID（例: \`LIN-123\`, \`quick-add-dark-mode\`, \`sentry-JAVASCRIPT-2K9\`）
- 要件情報（以下のいずれか）:
  - 事前調査ファイルのパス（任意、複数可）
  - 要件テキスト（事前調査なしの場合）

## 手順

### 1. チーム作成

TeamCreate でチームを作成する。

\`\`\`
team_name: plan-{タスクID}
description: 実装計画の作成とレビュー
\`\`\`

### 2. メンバー起動

Agent ツールで planner と reviewer を同時に起動する（並列）。

planner の起動:
\`\`\`
Agent(
  team_name: "plan-{タスクID}",
  name: "planner",
  prompt: 以下の「planner の作業内容」セクションの指示 + 入力情報
)
\`\`\`

reviewer の起動:
\`\`\`
Agent(
  team_name: "plan-{タスクID}",
  name: "reviewer",
  prompt: 以下の「reviewer の作業内容」セクションの指示
)
\`\`\`

reviewer は planner の計画完成を待つ必要があるため、起動時に「planner の計画が完成したら SendMessage で通知が届く。届くまで待機せよ」と指示する。

### 3. リーダーの役割

メインエージェント（リーダー）は以下を担当する:

- planner / reviewer の進捗監視
- レビューサイクルが最大3回で打ち切られることの管理
- 3回で解決しない場合はユーザーに報告して判断を仰ぐ
- レビューPASS後、計画をユーザーに提示して承認を得る
- フィードバックがあれば planner に SendMessage で修正を依頼する
- チーム完了後のシャットダウン:
  1. 全teammateに SendMessage で \`{type: "shutdown_request"}\` を送信
  2. 各teammateの \`shutdown_response\`（approve）を確認
  3. 全員がシャットダウンしたら TeamDelete でチームリソースを削除

### 4. 出力

- 実装計画の保存先パス（\`~/claude-code-data/workflows/{タスクID}/plan.md\`）

---

## planner の作業内容

### 役割
チケットの要件に基づいてコードベースを調査し、実装計画を作成する。

### 手順

#### P1. 要件の把握
入力として渡された情報（事前調査ファイルのパス、要件テキスト等）から要件を把握する。
LinearチケットIDが渡されている場合は Linear MCP の \`get_issue\` で最新内容を取得する。

整理する項目:
- 何を実現するか（ゴール）
- 受入条件の一覧
- 制約・注意事項

#### P2. コードベース調査
事前調査に関連コードや原因仮説が含まれる場合はそれを起点に調査を進める。

以下を調査する:
- チケットに関連する既存コード（ファイルパス・関数名を特定）
- 既存の設計パターン・命名規則・ディレクトリ構造
- 関連するテストの構造・テストフレームワーク
- 依存関係（変更が影響するコード）
- プロジェクトの \`.claude/skills/\` に関連スキルがあるか（スクリーンショット、テスト、デプロイ等）

#### P3. 実装計画の作成
調査結果をもとに、[template.md](template.md) のフォーマットで実装計画を作成する。

#### P4. 計画の保存
計画を \`~/claude-code-data/workflows/{タスクID}/plan.md\` に保存する。

#### P5. reviewer に通知
計画の保存先パスを reviewer に SendMessage で通知する。

#### P6. レビュー対応
reviewer から NEEDS_REVISION の通知を受けた場合、通知に含まれるレビュー結果のファイルパスから指摘内容を読み込み、計画を修正する。修正後、reviewer に SendMessage でファイルパスと修正完了の旨のみを通知する。

---

## reviewer の作業内容

### 役割
実装計画を第三者の視点でレビューし、漏れや設計上の問題を指摘する。

### 手順

#### R1. 計画の受領待ち
planner から計画の保存先パスが SendMessage で届くまで待機する。

#### R2. 計画の読み込み
通知されたパスから実装計画を読み込む。チケットの要件は Linear MCP は使わず、計画に記載されたゴール・受入条件を参照する。

#### R3. コードベースの軽い調査
計画の前提が正しいか、コードベースを確認する。

#### R4. レビュー
以下の観点でレビューする:

要件との整合性:
- 受入条件がすべて実装ステップでカバーされているか
- スコープ外の変更が含まれていないか

実現可能性:
- 変更対象のファイル・関数が実在するか
- 既存コードの構造と矛盾する計画になっていないか
- 依存関係の考慮漏れがないか

設計判断:
- 既存の設計パターンに沿っているか
- より単純なアプローチがないか
- 変更の影響範囲が適切に把握されているか

テスト計画:
- 受入条件に対応するテストが計画されているか
- エッジケースのテストが考慮されているか
- テストの種別（unit/integration）が適切か

実装順序:
- ステップの順序に依存関係の矛盾がないか
- 段階的に動作確認できる順序になっているか

#### R5. レビュー結果の保存と通知
レビュー結果を \`~/claude-code-data/workflows/{タスクID}/plan-review.md\` に保存する。

ファイルのフォーマット:
\`\`\`markdown
## 計画レビュー結果

### 判定: {PASS / NEEDS_REVISION}

### 指摘事項
（NEEDS_REVISIONの場合のみ）

#### [{重要度: critical/major/minor}] {指摘の概要}
- 対象: {計画のどの部分か}
- 問題: {何が問題か}
- 提案: {どう修正すべきか}

### 良い点
- {計画の良かった点}
\`\`\`

保存後、planner と リーダー（team lead）の両方に SendMessage で通知する。SendMessage には判定結果（PASS / NEEDS_REVISION）とファイルパスのみを含める。レビューの詳細はファイルを参照させる。

#### R6. 再レビュー
planner から修正通知を受けたら、修正された計画を再度レビューする（R2 に戻る）。レビュー結果は同じファイルパスに上書き保存する。

注意:
- 計画の作成経緯は知らない前提でレビューする
- 指摘は具体的に。計画のどのセクション・ステップかを明示する
- セキュアな情報を出力に含めない`,
});

export default planTeamSkill;
