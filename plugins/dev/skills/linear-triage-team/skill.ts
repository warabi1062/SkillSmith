// linear-triage-team スキル: Agent Teamでtriager/reviewerを編成し、Linearチケットの調査・計画作成とレビューを行う

import { WorkerWithAgentTeam, tool } from "../../../../app/lib/types";
import type { Teammate } from "../../../../app/lib/types";

const triager: Teammate = {
  name: "triager",
  role: "Linearチケットの内容を調査・分析し、更新・分割の計画を作成する。チケットの更新や分割は実行しない。",
  sortOrder: 1,
  communicationPattern: { type: "responder" },
  steps: [
    {
      id: "T1",
      title: "チケット取得",
      body: "Linear MCPの `get_issue` でチケットのtitle, description, labels, priority, assigneeを取得する。",
    },
    {
      id: "T2",
      title: "情報の充足度チェック",
      body: `以下の観点でチケット内容を評価する:

- 目的・背景: なぜこの変更が必要か明記されているか
- 受入条件: 完了の定義が明確か（具体的な振る舞いの記述があるか）
- 技術的コンテキスト: 対象のコンポーネント・ファイル・APIなどが特定できるか
- 影響範囲: 他機能への影響が考慮されているか

充足度を「十分」「一部不足」「大幅不足」で判定する。`,
    },
    {
      id: "T3",
      title: "情報補完（不足がある場合）",
      body: `不足情報に応じて以下のソースから情報を収集する:

Slack:
- チケットに関連するキーワード（タイトル、機能名）でSlack MCPを使い検索
- 関連する議論・決定事項を抽出

Notion:
- 仕様書・設計ドキュメントをNotion MCPで検索
- 技術仕様・画面仕様などの詳細を取得`,
    },
    {
      id: "T4",
      title: "スコープ分析",
      bodyFile: "step-scope-analysis.md",
    },
    {
      id: "T5",
      title: "計画の作成と保存",
      bodyFile: "step-plan-creation.md",
    },
    {
      id: "T6",
      title: "reviewer からのレビュー結果を待つ",
      body: `計画を保存したら、reviewer からの連絡を待つ。reviewer が status_check で状況を確認してくるので、応答する（後述の「status_check への応答ルール」参照）。

reviewer からレビュー結果を受け取ったら:
- PASS の場合 → T8 へ進む
- NEEDS_REVISION の場合 → T7 へ進む`,
    },
    {
      id: "T7",
      title: "レビュー対応（→ T6 に戻る）",
      body: `reviewer から NEEDS_REVISION の通知を受けた場合、通知に含まれるレビュー結果のファイルパスから指摘内容を読み込み、対応する。

- must: 計画を修正する
- imo: 採用するか判断し、採用する場合は修正、しない場合は理由を回答する
- question: 質問に回答する。質問が出たこと自体が計画の分かりにくさの兆候かもしれないため、回答に加えて記述の改善も検討する

対応後、計画ファイルに対応内容（修正箇所、imo判断の理由、質問への回答）を追記する。reviewer が status_check で修正完了を検知するので、T6 の待機に戻る。`,
    },
    {
      id: "T8",
      title: "作業完了後の待機",
      body: "レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。リーダーやチームメンバーからフィードバック付きの修正依頼が届く場合があるため、メッセージを受信したら対応する。shutdown_request を受けたら shutdown_response（approve）を返して終了する。",
    },
  ],
};

const reviewer: Teammate = {
  name: "reviewer",
  role: "triage計画を第三者の視点でレビューし、問題を指摘する。",
  sortOrder: 2,
  communicationPattern: { type: "poller", target: "triager" },
  steps: [
    {
      id: "R1",
      title: "作業完了のポーリング",
      body: `triager に SendMessage で \`{type: "status_check"}\` を送信し、返信を待つ。

- \`{status: "working"}\` → 2分待ってから再度 status_check を送信（R1 を繰り返す）
- \`{status: "done", path: "..."}\` → R2 へ進む
- \`{status: "blocked", reason: "..."}\` → リーダーに報告し、R1 を繰り返す`,
    },
    {
      id: "R2",
      title: "計画の読み込み",
      body: "通知されたパスからtriage計画を読み込む。",
    },
    {
      id: "R3",
      title: "チケットの現状確認",
      body: "Linear MCPの `get_issue` でチケットの現在の状態を取得し、計画の前提が正しいか確認する。",
    },
    {
      id: "R4",
      title: "レビュー",
      bodyFile: "step-review.md",
    },
    {
      id: "R5",
      title: "レビュー結果の保存と通知",
      bodyFile: "step-review-result.md",
    },
    {
      id: "R6",
      title: "修正完了のポーリング（→ R2 に戻る）",
      body: "NEEDS_REVISION 送信後、triager の修正完了を確認する。R1 と同じ要領で status_check を送信し、`{status: \"done\"}` を受け取ったら R2 に戻って再レビューする。レビュー結果は同じファイルパスに上書き保存する。",
    },
    {
      id: "R7",
      title: "作業完了後の待機",
      body: `レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。shutdown_request を受けたら shutdown_response（approve）を返して終了する。

注意:
- 計画の作成経緯は知らない前提でレビューする
- 指摘は具体的に。計画のどのセクションかを明示する
- セキュアな情報を出力に含めない
- shutdown_request が届くまで自発的に作業完了としないこと`,
    },
  ],
};

const linearTriageTeamSkill = new WorkerWithAgentTeam({
  name: "linear-triage-team",
  description:
    "Agent Teamでtriager/reviewerを編成し、Linearチケットの調査・計画作成とレビューを行う。ワークフローの一部として使用される。",
  input: "- チケットID（例: `LIN-123`）",
  output: "- triage計画のパス",
  allowedTools: [
    tool("Read"),
    tool("Write"),
    tool("Glob"),
    tool("Grep"),
    tool("Task"),
    tool("AskUserQuestion"),
    tool("ToolSearch"),
  ],
  files: [
    { role: "TEMPLATE", filename: "template-result.md", sortOrder: 1 },
  ],
  teammates: [triager, reviewer],
  teamPrefix: "triage",
  requiresUserApproval: true,
});

export default linearTriageTeamSkill;
