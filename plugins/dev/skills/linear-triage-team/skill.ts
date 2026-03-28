// linear-triage-team スキル: Agent Teamでtriager/reviewerを編成し、Linearチケットの調査・計画作成とレビューを行う

import { WorkerWithAgentTeam, tool } from "../../../../app/lib/types";
import type { Teammate, SupportFile } from "../../../../app/lib/types";

const templateResult: SupportFile = {
  role: "TEMPLATE",
  filename: "template-result.md",
  sortOrder: 1,
};
const descriptionStructure: SupportFile = {
  role: "REFERENCE",
  filename: "description-structure.md",
  sortOrder: 2,
};
const triageReviewFormat: SupportFile = {
  role: "REFERENCE",
  filename: "triage-review-format.md",
  sortOrder: 3,
};

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
      body: `チケットのdescription・受入条件から実装スコープを分析する。以下を評価:

- 変更が必要なファイル数の見積もり
- 機能の独立性（複数の独立した機能変更が含まれるか）
- DB変更・API変更・UI変更など異なるレイヤーの変更が混在するか

以下のいずれかに該当する場合、分割が必要と判断する:

- 独立した複数の機能変更が含まれる
- 異なるレイヤー（DB/API/UI）の大きな変更が混在する
- 受入条件が5つ以上あり、それぞれ独立している
- 実装が段階的に進められる（例: バックエンド → フロントエンド）`,
    },
    {
      id: "T5",
      title: "計画の作成と保存",
      body: `\`~/claude-code-data/workflows/{チケットID}/triage-plan.md\` に [${templateResult.filename}](${templateResult.filename}) 形式で計画を書き出す。

内容:
- チケット更新内容（提案するdescription全文）
- 分割計画（分割する場合: 各サブチケットのtitle, description, 依存関係）
- 判断根拠

descriptionの構造ルール: [${descriptionStructure.filename}](${descriptionStructure.filename})`,
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
      body: `以下の観点でレビューする:

更新内容の妥当性:
- 補完情報が正確か
- 受入条件が具体的か（曖昧な表現がないか）
- 元のチケット内容を損なっていないか

分割の適切さ:
- 分割粒度は適切か（細かすぎ・大きすぎがないか）
- 不要な分割がないか
- 漏れているスコープがないか

依存関係:
- サブチケット間の依存が正しいか
- 循環依存がないか
- 実装順序が合理的か`,
    },
    {
      id: "R5",
      title: "レビュー結果の保存と通知",
      body: `レビュー結果を \`~/claude-code-data/workflows/{チケットID}/triage-review.md\` に保存する。

ファイルのフォーマット: [${triageReviewFormat.filename}](${triageReviewFormat.filename})

保存後、triager と リーダー（team lead）の両方に SendMessage で通知する。SendMessage には判定結果（PASS / NEEDS_REVISION）とファイルパスのみを含める。

- NEEDS_REVISION を送った場合 → R6 へ進み、triager の修正通知を待つ
- PASS を送った場合 → R7 へ進む`,
    },
    {
      id: "R6",
      title: "修正完了のポーリング（→ R2 に戻る）",
      body: 'NEEDS_REVISION 送信後、triager の修正完了を確認する。R1 と同じ要領で status_check を送信し、`{status: "done"}` を受け取ったら R2 に戻って再レビューする。レビュー結果は同じファイルパスに上書き保存する。',
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
  files: [templateResult, descriptionStructure, triageReviewFormat],
  teammates: [triager, reviewer],
  teamPrefix: "triage",
  requiresUserApproval: true,
});

export default linearTriageTeamSkill;
