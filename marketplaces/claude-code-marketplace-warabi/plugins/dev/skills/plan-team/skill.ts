// plan-team スキル: Agent Teamでplanner/reviewerを編成し、実装計画の作成とレビューを並列で行う

import { WorkerWithAgentTeam, tool } from "../../../../../../app/lib/types";
import type { Teammate, SupportFile } from "../../../../../../app/lib/types";

const template: SupportFile = {
  role: "TEMPLATE",
  filename: "template.md",
  sortOrder: 1,
};
const planReviewFormat: SupportFile = {
  role: "REFERENCE",
  filename: "template-review.md",
  sortOrder: 2,
};

const planner: Teammate = {
  name: "planner",
  role: "チケットの要件に基づいてコードベースを調査し、実装計画を作成する。",
  sortOrder: 1,
  steps: [
    {
      id: "P1",
      title: "要件の把握",
      body: `入力として渡された情報（事前調査ファイルのパス、要件テキスト等）から要件を把握する。
LinearチケットIDが渡されている場合は Linear MCP の \`get_issue\` で最新内容を取得する。

整理する項目:
- 何を実現するか（ゴール）
- 受入条件の一覧
- 制約・注意事項`,
    },
    {
      id: "P2",
      title: "コードベース調査",
      body: `事前調査に関連コードや原因仮説が含まれる場合はそれを起点に調査を進める。

以下を調査する:
- チケットに関連する既存コード（ファイルパス・関数名を特定）
- 既存の設計パターン・命名規則・ディレクトリ構造
- 関連するテストの構造・テストフレームワーク
- 依存関係（変更が影響するコード）
- プロジェクトの \`.claude/skills/\` に関連スキルがあるか（スクリーンショット、テスト、デプロイ等）`,
    },
    {
      id: "P3",
      title: "実装計画の作成",
      body: `調査結果をもとに、[${template.filename}](${template.filename}) のフォーマットで実装計画を作成する。`,
    },
    {
      id: "P4",
      title: "計画の保存",
      body: "計画を `~/claude-code-data/workflows/{タスクID}/plan.md` に保存する。",
    },
    {
      id: "P5",
      title: "reviewer に完了を通知する",
      body: "reviewer に計画が完了した旨と計画ファイルのパスを伝える。",
    },
    {
      id: "P6",
      title: "レビュー対応",
      body: `reviewer から NEEDS_REVISION を受け取った場合、通知に含まれるレビュー結果のファイルパスから指摘内容を読み込み、対応する。

- must: 計画を修正する
- imo: 採用するか判断し、採用する場合は修正、しない場合は理由を回答する
- question: 質問に回答する。質問が出たこと自体が計画の分かりにくさの兆候かもしれないため、回答に加えて記述の改善も検討する

対応後、計画ファイルに対応内容（修正箇所、imo判断の理由、質問への回答）を追記する。reviewer に修正が完了した旨と計画ファイルのパスを伝える。`,
    },
  ],
};

const reviewer: Teammate = {
  name: "reviewer",
  role: "実装計画を第三者の視点でレビューし、漏れや設計上の問題を指摘する。計画の作成経緯は知らない前提でレビューする。問題点や理由を曖昧にせず具体的に指摘する。セキュアな情報を出力に含めない。",
  sortOrder: 2,
  steps: [
    {
      id: "R1",
      title: "計画の読み込み",
      body: "planner から通知されたファイルパスから実装計画を読み込む。チケットの要件は Linear MCP は使わず、計画に記載されたゴール・受入条件を参照する。",
    },
    {
      id: "R2",
      title: "コードベースの軽い調査",
      body: "計画の前提が正しいか、コードベースを確認する。",
    },
    {
      id: "R3",
      title: "レビュー",
      body: `以下の観点でレビューする:

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
- 段階的に動作確認できる順序になっているか`,
    },
    {
      id: "R4",
      title: "レビュー結果の保存",
      body: `レビュー結果を \`~/claude-code-data/workflows/{タスクID}/plan-review.md\` に [${planReviewFormat.filename}](${planReviewFormat.filename}) 形式で保存する。`,
    },
    {
      id: "R5",
      title: "通知",
      body: `planner と リーダー（team lead）の両方に判定結果（PASS / NEEDS_REVISION）とファイルパスを伝える。`,
    },
    {
      id: "R6",
      title: "再レビュー",
      body: "NEEDS_REVISION の場合、planner が計画を修正したら R1 に戻って再レビューする。レビュー結果は同じファイルパスに上書き保存する。",
    },
  ],
};

const planTeamSkill = new WorkerWithAgentTeam({
  name: "plan-team",
  description:
    "Agent Teamでplanner/reviewerを編成し、実装計画の作成とレビューを並列で行う。ワークフローの一部として使用される。",
  input: [
    "- タスクID（例: `LIN-123`, `quick-add-dark-mode`）",
    "- 要件情報（以下のいずれか）:",
    "  - 事前調査ファイルのパス（任意、複数可）",
    "  - 要件テキスト（事前調査なしの場合）",
  ],
  output: ["- 実装計画のファイルパス"],
  allowedTools: [
    tool("Read"),
    tool("Write"),
    tool("Glob"),
    tool("Grep"),
    tool("Bash"),
    tool("Task"),
    tool("AskUserQuestion"),
    tool("ToolSearch"),
  ],
  files: [template, planReviewFormat],
  teammates: [planner, reviewer],
  teamPrefix: "plan",
  requiresUserApproval: true,
});

export default planTeamSkill;
