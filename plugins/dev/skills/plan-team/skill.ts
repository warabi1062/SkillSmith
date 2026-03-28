// plan-team スキル: Agent Teamでplanner/reviewerを編成し、実装計画の作成とレビューを並列で行う

import { WorkerWithAgentTeam, tool } from "../../../../app/lib/types";
import type { Teammate, SupportFile } from "../../../../app/lib/types";

const template: SupportFile = {
  role: "TEMPLATE",
  filename: "template.md",
  sortOrder: 1,
};
const planReviewFormat: SupportFile = {
  role: "REFERENCE",
  filename: "plan-review-format.md",
  sortOrder: 2,
};

const planner: Teammate = {
  name: "planner",
  role: "チケットの要件に基づいてコードベースを調査し、実装計画を作成する。",
  sortOrder: 1,
  communicationPattern: { type: "responder" },
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
      title: "reviewer からのレビュー結果を待つ",
      body: `計画を保存したら、reviewer からの連絡を待つ。reviewer が status_check で状況を確認してくるので、応答する（後述の「status_check への応答ルール」参照）。

reviewer からレビュー結果を受け取ったら:
- PASS の場合 → P7 へ進む
- NEEDS_REVISION の場合 → P6 へ進む`,
    },
    {
      id: "P6",
      title: "レビュー対応（→ P5 に戻る）",
      body: `reviewer から NEEDS_REVISION の通知を受けた場合、通知に含まれるレビュー結果のファイルパスから指摘内容を読み込み、対応する。

- must: 計画を修正する
- imo: 採用するか判断し、採用する場合は修正、しない場合は理由を回答する
- question: 質問に回答する。質問が出たこと自体が計画の分かりにくさの兆候かもしれないため、回答に加えて記述の改善も検討する

対応後、計画ファイルに対応内容（修正箇所、imo判断の理由、質問への回答）を追記する。reviewer が status_check で修正完了を検知するので、P5 の待機に戻る。`,
    },
    {
      id: "P7",
      title: "作業完了後の待機",
      body: "レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。リーダーやチームメンバーからフィードバック付きの修正依頼が届く場合があるため、メッセージを受信したら対応する。shutdown_request を受けたら shutdown_response（approve）を返して終了する。",
    },
  ],
};

const reviewer: Teammate = {
  name: "reviewer",
  role: "実装計画を第三者の視点でレビューし、漏れや設計上の問題を指摘する。",
  sortOrder: 2,
  communicationPattern: { type: "poller", target: "planner" },
  steps: [
    {
      id: "R1",
      title: "作業完了のポーリング",
      body: `planner に SendMessage で \`{type: "status_check"}\` を送信し、返信を待つ。

- \`{status: "working"}\` → 2分待ってから再度 status_check を送信（R1 を繰り返す）
- \`{status: "done", path: "..."}\` → R2 へ進む
- \`{status: "blocked", reason: "..."}\` → リーダーに報告し、R1 を繰り返す`,
    },
    {
      id: "R2",
      title: "計画の読み込み",
      body: "通知されたパスから実装計画を読み込む。チケットの要件は Linear MCP は使わず、計画に記載されたゴール・受入条件を参照する。",
    },
    {
      id: "R3",
      title: "コードベースの軽い調査",
      body: "計画の前提が正しいか、コードベースを確認する。",
    },
    {
      id: "R4",
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
      id: "R5",
      title: "レビュー結果の保存と通知",
      body: `レビュー結果を \`~/claude-code-data/workflows/{タスクID}/plan-review.md\` に保存する。

ファイルのフォーマット: [${planReviewFormat.filename}](${planReviewFormat.filename})

保存後、planner と リーダー（team lead）の両方に SendMessage で通知する。SendMessage には判定結果（PASS / NEEDS_REVISION）とファイルパスのみを含める。レビューの詳細はファイルを参照させる。

- NEEDS_REVISION を送った場合 → R6 へ進み、planner の修正通知を待つ
- PASS を送った場合 → R7 へ進む`,
    },
    {
      id: "R6",
      title: "修正完了のポーリング（→ R2 に戻る）",
      body: 'NEEDS_REVISION 送信後、planner の修正完了を確認する。R1 と同じ要領で status_check を送信し、`{status: "done"}` を受け取ったら R2 に戻って再レビューする。レビュー結果は同じファイルパスに上書き保存する。',
    },
    {
      id: "R7",
      title: "作業完了後の待機",
      body: `レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。shutdown_request を受けたら shutdown_response（approve）を返して終了する。

注意:
- 計画の作成経緯は知らない前提でレビューする
- 指摘は具体的に。計画のどのセクション・ステップかを明示する
- セキュアな情報を出力に含めない
- shutdown_request が届くまで自発的に作業完了としないこと`,
    },
  ],
};

const planTeamSkill = new WorkerWithAgentTeam({
  name: "plan-team",
  description:
    "Agent Teamでplanner/reviewerを編成し、実装計画の作成とレビューを並列で行う。ワークフローの一部として使用される。",
  input: `- タスクID（例: \`LIN-123\`, \`quick-add-dark-mode\`）
- 要件情報（以下のいずれか）:
  - 事前調査ファイルのパス（任意、複数可）
  - 要件テキスト（事前調査なしの場合）`,
  output:
    "- 実装計画の保存先パス（`~/claude-code-data/workflows/{タスクID}/plan.md`）",
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
