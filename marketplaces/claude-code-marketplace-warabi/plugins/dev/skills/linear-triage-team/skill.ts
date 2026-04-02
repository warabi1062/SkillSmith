// linear-triage-team スキル: Agent Teamでtriager/reviewer/executorを編成し、Linearチケットの調査・計画作成・レビュー・実行を行う

import {
  WorkerWithAgentTeam,
  tool,
  mcp,
} from "../../../../../../app/lib/types";
import type { Teammate, SupportFile } from "../../../../../../app/lib/types";

const templateResult: SupportFile = {
  role: "TEMPLATE",
  filename: "template-result.md",
  sortOrder: 1,
};
const triageReviewFormat: SupportFile = {
  role: "REFERENCE",
  filename: "template-review.md",
  sortOrder: 2,
};
const templateTriageResult: SupportFile = {
  role: "TEMPLATE",
  filename: "template-triage-result.md",
  sortOrder: 3,
};

const triager: Teammate = {
  name: "triager",
  role: "Linearチケットの内容を調査・分析し、更新・分割の計画を作成する。チケットの更新や分割は実行しない。",
  sortOrder: 1,
  steps: [
    {
      id: "T1",
      title: "チケット取得",
      body: "Linear MCPの `get_issue` でチケットの情報を取得する。",
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
      title: "実装調査",
      body: "コードベースを調査し、関連ファイルのどの部分に修正が必要か、全体でどういう修正になるかを把握する。",
    },
    {
      id: "T5",
      title: "計画の作成と保存",
      body: `\`~/claude-code-data/workflows/{チケットID}/triage-plan.md\` に [${templateResult.filename}](${templateResult.filename}) 形式で計画を書き出す。

内容:
- チケット更新内容（提案するdescription全文）
- 分割計画（分割する場合: 各サブチケットのtitle, description, 依存関係）。1チケット = 1PRの粒度で分割する
- 判断根拠

descriptionの構造ルール:
チケットのdescriptionは \`---\`（divider）で「全員向け」と「開発者向け」に区分けする。
- dividerより上: 目的・背景、要件、受入条件、再現手順など、チームの誰もが理解すべき情報
- dividerより下: 技術メモ（対象コンポーネント・ファイル・API・実装方針など）、影響範囲

コードに関する記述やファイルパス、技術的な実装詳細はdividerより下に配置する。既存のdescriptionにdividerがない場合は適切な位置にdividerを挿入して整理する。分割で作成するサブチケットのdescriptionにも同じルールを適用する。`,
    },
    {
      id: "T6",
      title: "reviewer に完了を通知する",
      body: "計画を保存したら、reviewer に計画が完了した旨と計画ファイルのパスを伝える。",
    },
    {
      id: "T7",
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
  role: "triage計画を第三者の視点でレビューし、問題を指摘する。計画の作成経緯は知らない前提でレビューする。問題点や理由を曖昧にせず具体的に指摘する。セキュアな情報を出力に含めない。",
  sortOrder: 2,
  steps: [
    {
      id: "R1",
      title: "計画の読み込み",
      body: "triager から通知されたファイルパスからtriage計画を読み込む。",
    },
    {
      id: "R2",
      title: "チケットの現状確認",
      body: "Linear MCPの `get_issue` でチケットの現在の状態を取得し、計画の前提が正しいか確認する。",
    },
    {
      id: "R3",
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
      id: "R4",
      title: "レビュー結果の保存",
      body: `レビュー結果を \`~/claude-code-data/workflows/{チケットID}/triage-review.md\` に [${triageReviewFormat.filename}](${triageReviewFormat.filename}) 形式で保存する。`,
    },
    {
      id: "R5",
      title: "通知",
      body: `triager と リーダー（team lead）の両方に判定結果（PASS / NEEDS_REVISION）とファイルパスを伝える。`,
    },
    {
      id: "R6",
      title: "再レビュー",
      body: "NEEDS_REVISION の場合、triager が計画を修正したら R1 に戻って再レビューする。レビュー結果は同じファイルパスに上書き保存する。",
    },
  ],
};

const executor: Teammate = {
  name: "executor",
  role: "承認済みのtriage計画に基づいて、Linearチケットの更新・サブチケット作成を実行する。",
  sortOrder: 3,
  steps: [
    {
      id: "E1",
      title: "計画の読み込み",
      body: "リーダーから受け取ったファイルパスの計画ファイルを読み込む。",
    },
    {
      id: "E2",
      title: "チケット更新",
      body: "Linear MCPの `save_issue` でチケットのdescriptionを計画の「チケット更新案」の内容に更新する。",
    },
    {
      id: "E3",
      title: "サブチケット作成（分割計画がある場合）",
      body: `分割計画に基づき \`save_issue\` で各サブチケットを作成する:

- 元チケットを親に設定（\`parentId\`）
- 各サブチケットに計画通りのtitle, descriptionを設定
- 元チケットのlabels, priority, assigneeを継承
- 依存関係がある場合は設定`,
    },
    {
      id: "E4",
      title: "結果の保存",
      body: `\`~/claude-code-data/workflows/{チケットID}/triage-result.md\` に [${templateTriageResult.filename}](${templateTriageResult.filename}) 形式で結果を書き出す。`,
    },
    {
      id: "E5",
      title: "完了通知",
      body: "リーダーに完了を通知する。結果ファイルのパスと、分割の有無・着手チケットIDを伝える。",
    },
  ],
};

const linearTriageTeamSkill = new WorkerWithAgentTeam({
  name: "linear-triage-team",
  displayName: "Triage Team",
  description:
    "Agent Teamでtriager/reviewer/executorを編成し、Linearチケットの調査・計画作成・レビュー・実行を行う。ワークフローの一部として使用される。",
  input: ["チケットID"],
  output: ["triage計画のファイルパス", "triage結果のファイルパス"],
  allowedTools: [
    tool("Read"),
    tool("Write"),
    tool("Glob"),
    tool("Grep"),
    tool("Task"),
    tool("AskUserQuestion"),
    tool("ToolSearch"),
    mcp("plugin_linear_linear", "get_issue"),
    mcp("plugin_linear_linear", "save_issue"),
    mcp("plugin_linear_linear", "list_issues"),
  ],
  files: [templateResult, triageReviewFormat, templateTriageResult],
  teammates: [triager, reviewer, executor],
  teamPrefix: "triage",
  additionalLeaderSteps: [
    "ユーザー承認後、executor に実行を指示する（計画ファイルのファイルパスを伝える）",
    "executor から完了通知を受け取り、triage結果のファイルパスを記録する",
    "分割が発生した場合、ユーザーにどのサブチケットから着手するか確認を取る",
  ],
  requiresUserApproval: true,
});

export default linearTriageTeamSkill;
