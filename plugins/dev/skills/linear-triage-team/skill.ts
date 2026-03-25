// linear-triage-team スキル: Agent Teamでtriager/reviewerを編成し、Linearチケットの調査・計画作成とレビューを行う

import { WorkerWithAgentTeam } from "../../../../app/lib/types";

const linearTriageTeamSkill = new WorkerWithAgentTeam({
  name: "linear-triage-team",
  description:
    "Agent Teamでtriager/reviewerを編成し、Linearチケットの調査・計画作成とレビューを行う。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Write",
    "Glob",
    "Grep",
    "Task",
    "AskUserQuestion",
    "ToolSearch",
  ],
  files: [
    { role: "TEMPLATE", filename: "template-result.md", sortOrder: 1 },
  ],
  agentTeamMembers: [
    { skillName: "triager", sortOrder: 1 },
    { skillName: "reviewer", sortOrder: 2 },
  ],
  content: `# Triage Team

Agent Team を使い、triager と reviewer の2名体制でLinearチケットの調査・計画作成・レビューを行う。
このスキルはメインエージェントがリーダーとして直接実行する。

## 入力

- チケットID（例: \`LIN-123\`）

## 手順

### 1. チーム作成

TeamCreate でチームを作成する。

\`\`\`
team_name: triage-{チケットID}
description: チケットの調査・計画作成とレビュー
\`\`\`

### 2. メンバー起動

Agent ツールで triager と reviewer を同時に起動する（並列）。

triager の起動:
\`\`\`
Agent(
  team_name: "triage-{チケットID}",
  name: "triager",
  prompt: 以下の「triager の作業内容」セクションの指示 + チケットID
)
\`\`\`

reviewer の起動:
\`\`\`
Agent(
  team_name: "triage-{チケットID}",
  name: "reviewer",
  prompt: 以下の「reviewer の作業内容」セクションの指示
)
\`\`\`

reviewer は起動後、triager に定期的に status_check を送信して進捗を確認する。

### 3. リーダーの役割

メインエージェント（リーダー）は以下を担当する:

- triager / reviewer の進捗監視
- レビューサイクルが最大3回で打ち切られることの管理
- 3回で解決しない場合はユーザーに報告して判断を仰ぐ
- レビューPASS後、計画をユーザーに提示して承認を得る
- フィードバックがあれば triager に SendMessage で修正を依頼する
- チーム完了後のシャットダウン:
  1. 全teammateに SendMessage で \`{type: "shutdown_request"}\` を送信
  2. 各teammateの \`shutdown_response\`（approve）を確認
  3. 全員がシャットダウンしたら TeamDelete でチームリソースを削除

### 4. 出力

- triage計画のパス

---

## triager の作業内容

### 役割
Linearチケットの内容を調査・分析し、更新・分割の計画を作成する。チケットの更新や分割は実行しない。

### 手順

#### T1. チケット取得
Linear MCPの \`get_issue\` でチケットのtitle, description, labels, priority, assigneeを取得する。

#### T2. 情報の充足度チェック
以下の観点でチケット内容を評価する:

- 目的・背景: なぜこの変更が必要か明記されているか
- 受入条件: 完了の定義が明確か（具体的な振る舞いの記述があるか）
- 技術的コンテキスト: 対象のコンポーネント・ファイル・APIなどが特定できるか
- 影響範囲: 他機能への影響が考慮されているか

充足度を「十分」「一部不足」「大幅不足」で判定する。

#### T3. 情報補完（不足がある場合）
不足情報に応じて以下のソースから情報を収集する:

Slack:
- チケットに関連するキーワード（タイトル、機能名）でSlack MCPを使い検索
- 関連する議論・決定事項を抽出

Notion:
- 仕様書・設計ドキュメントをNotion MCPで検索
- 技術仕様・画面仕様などの詳細を取得

#### T4. スコープ分析
チケットのdescription・受入条件から実装スコープを分析する。以下を評価:

- 変更が必要なファイル数の見積もり
- 機能の独立性（複数の独立した機能変更が含まれるか）
- DB変更・API変更・UI変更など異なるレイヤーの変更が混在するか

以下のいずれかに該当する場合、分割が必要と判断する:

- 独立した複数の機能変更が含まれる
- 異なるレイヤー（DB/API/UI）の大きな変更が混在する
- 受入条件が5つ以上あり、それぞれ独立している
- 実装が段階的に進められる（例: バックエンド → フロントエンド）

#### T5. 計画の作成と保存
\`~/claude-code-data/workflows/{チケットID}/triage-plan.md\` に [template-result.md](template-result.md) 形式で計画を書き出す。

内容:
- チケット更新内容（提案するdescription全文）
- 分割計画（分割する場合: 各サブチケットのtitle, description, 依存関係）
- 判断根拠

descriptionの構造ルール:
チケットのdescriptionは \`---\`（divider）で「全員向け」と「開発者向け」に区分けする。
- dividerより上: 目的・背景、要件、受入条件、再現手順など、チームの誰もが理解すべき情報
- dividerより下: 技術メモ（対象コンポーネント・ファイル・API・実装方針など）、影響範囲

コードに関する記述やファイルパス、技術的な実装詳細はdividerより下に配置する。既存のdescriptionにdividerがない場合は適切な位置にdividerを挿入して整理する。分割で作成するサブチケットのdescriptionにも同じルールを適用する。

#### T6. reviewer からのレビュー結果を待つ
計画を保存したら、reviewer からの連絡を待つ。reviewer が status_check で状況を確認してくるので、応答する（後述の「status_check への応答ルール」参照）。

reviewer からレビュー結果を受け取ったら:
- PASS の場合 → T8 へ進む
- NEEDS_REVISION の場合 → T7 へ進む

#### T7. レビュー対応（→ T6 に戻る）
reviewer から NEEDS_REVISION の通知を受けた場合、通知に含まれるレビュー結果のファイルパスから指摘内容を読み込み、対応する。

- must: 計画を修正する
- imo: 採用するか判断し、採用する場合は修正、しない場合は理由を回答する
- question: 質問に回答する。質問が出たこと自体が計画の分かりにくさの兆候かもしれないため、回答に加えて記述の改善も検討する

対応後、計画ファイルに対応内容（修正箇所、imo判断の理由、質問への回答）を追記する。reviewer が status_check で修正完了を検知するので、T6 の待機に戻る。

#### T8. 作業完了後の待機
レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。リーダーやチームメンバーからフィードバック付きの修正依頼が届く場合があるため、メッセージを受信したら対応する。shutdown_request を受けたら shutdown_response（approve）を返して終了する。

### status_check への応答ルール
作業中のどの時点でも、reviewer から \`{type: "status_check"}\` を受信する場合がある。受信したら現在の状況を即座に返信する:

- \`{status: "working"}\` — まだ作業中
- \`{status: "done", path: "{計画ファイルパス}"}\` — 作業完了またはレビュー指摘への対応完了。レビュー可能
- \`{status: "blocked", reason: "{理由}"}\` — ブロックされている

---

## reviewer の作業内容

### 役割
triage計画を第三者の視点でレビューし、問題を指摘する。

### 手順

#### R1. 作業完了のポーリング
triager に SendMessage で \`{type: "status_check"}\` を送信し、返信を待つ。

- \`{status: "working"}\` → 2分待ってから再度 status_check を送信（R1 を繰り返す）
- \`{status: "done", path: "..."}\` → R2 へ進む
- \`{status: "blocked", reason: "..."}\` → リーダーに報告し、R1 を繰り返す

#### R2. 計画の読み込み
通知されたパスからtriage計画を読み込む。

#### R3. チケットの現状確認
Linear MCPの \`get_issue\` でチケットの現在の状態を取得し、計画の前提が正しいか確認する。

#### R4. レビュー
以下の観点でレビューする:

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
- 実装順序が合理的か

#### R5. レビュー結果の保存と通知
レビュー結果を \`~/claude-code-data/workflows/{チケットID}/triage-review.md\` に保存する。

ファイルのフォーマット:
\`\`\`markdown
## Triage Plan レビュー結果

### 判定: {PASS / NEEDS_REVISION}

### 指摘事項
（NEEDS_REVISIONの場合のみ）

#### [{種別: must/imo/question}][{重要度: critical/major/minor}] {指摘の概要}
- must: 変えないと問題がある指摘
- imo: 問題はないが自分ならこうする、という提案
- question: 意図や背景の確認（回答によっては指摘に変わる可能性がある）
- 対象: {計画のどの部分か}
- 問題: {何が問題か}
- 方向性: {どういう方向で見直すべきか。答えが明確な場合のみ具体的な修正を書いてよい}
\`\`\`

保存後、triager と リーダー（team lead）の両方に SendMessage で通知する。SendMessage には判定結果（PASS / NEEDS_REVISION）とファイルパスのみを含める。

- NEEDS_REVISION を送った場合 → R6 へ進み、triager の修正通知を待つ
- PASS を送った場合 → R7 へ進む

#### R6. 修正完了のポーリング（→ R2 に戻る）
NEEDS_REVISION 送信後、triager の修正完了を確認する。R1 と同じ要領で status_check を送信し、\`{status: "done"}\` を受け取ったら R2 に戻って再レビューする。レビュー結果は同じファイルパスに上書き保存する。

#### R7. 作業完了後の待機
レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。shutdown_request を受けたら shutdown_response（approve）を返して終了する。

注意:
- 計画の作成経緯は知らない前提でレビューする
- 指摘は具体的に。計画のどのセクションかを明示する
- セキュアな情報を出力に含めない
- shutdown_request が届くまで自発的に作業完了としないこと`,
});

export default linearTriageTeamSkill;
