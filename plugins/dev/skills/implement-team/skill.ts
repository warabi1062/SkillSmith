// implement-team スキル: Agent Teamでimplementer/reviewerを編成し、コード実装とレビューを行う

import { WorkerWithAgentTeam } from "../../../../app/lib/types";

const implementTeamSkill = new WorkerWithAgentTeam({
  name: "implement-team",
  description:
    "Agent Teamでimplementer/reviewerを編成し、コード実装とレビューを行う。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "Bash",
    "Task",
    "AskUserQuestion",
    "ToolSearch",
  ],
  files: [
    { role: "TEMPLATE", filename: "template-result.md", sortOrder: 1 },
  ],
  agentTeamMembers: [
    { skillName: "implementer", sortOrder: 1 },
    { skillName: "reviewer", sortOrder: 2 },
  ],
  content: `# Implement Team

Agent Team を使い、implementer と reviewer の2名体制でコード実装・レビューを行う。
このスキルはメインエージェントがリーダーとして直接実行する。

## 入力

- タスクID
- 実装計画のパス

## 手順

### 1. チーム作成

TeamCreate でチームを作成する。

\`\`\`
team_name: impl-{タスクID}
description: コード実装とレビュー
\`\`\`

### 2. メンバー起動

Agent ツールで implementer と reviewer を同時に起動する（並列）。

implementer の起動:
\`\`\`
Agent(
  team_name: "impl-{タスクID}",
  name: "implementer",
  prompt: 以下の「implementer の作業内容」セクションの指示 + 入力情報
)
\`\`\`

reviewer の起動:
\`\`\`
Agent(
  team_name: "impl-{タスクID}",
  name: "reviewer",
  prompt: 以下の「reviewer の作業内容」セクションの指示
)
\`\`\`

reviewer は起動後、implementer に定期的に status_check を送信して進捗を確認する。

### 3. リーダーの役割

メインエージェント（リーダー）は以下を担当する:

- implementer / reviewer の進捗監視
- レビューサイクルが最大3回で打ち切られることの管理
- 3回で解決しない場合はユーザーに報告して判断を仰ぐ
- チーム完了後のシャットダウン:
  1. 全teammateに SendMessage で \`{type: "shutdown_request"}\` を送信
  2. 各teammateの \`shutdown_response\`（approve）を確認
  3. 全員がシャットダウンしたら TeamDelete でチームリソースを削除

### 4. 出力

- 実装結果のパス

---

## implementer の作業内容

### 役割
実装計画に従ってコードを実装し、テストを書く。

### 手順

#### I1. 実装計画の読み込み
入力として渡された実装計画のパスを読み込み、実装ステップ・変更ファイル・テスト計画を把握する。

#### I2. 実装
計画のコミット計画に従い、コミット単位で実装を進める。
1つのコミットの実装が完了したらコミットし、次のコミットに進む。

テスト:
- 3A形式（Arrange / Act / Assert）で記述
- Red-Green-Refactorサイクルで進める:
  1. 失敗するテストを書く
  2. テストが通る最小限の実装をする
  3. リファクタリングする

コード品質:
- 計画に記載された既存パターンに従う
- 不要な変更を加えない（計画のスコープに限定）
- TypeScriptの場合はLSPで型エラーがないことを確認

#### I3. セルフチェック
実装完了後、自身で以下を確認する:
- 計画通りに実装できたか
- 計画にない変更が発生した場合、その理由を記録
- テストがすべてpassするか
- 明らかなコード品質の問題がないか

問題があれば修正してから完了とする。

#### I4. 結果の保存
\`~/claude-code-data/workflows/{タスクID}/implement-result.md\` に [template-result.md](template-result.md) 形式で結果を書き出す。

#### I5. reviewer からのレビュー結果を待つ
実装結果を保存したら、reviewer からの連絡を待つ。reviewer が status_check で状況を確認してくるので、応答する（後述の「status_check への応答ルール」参照）。

reviewer からレビュー結果を受け取ったら:
- PASS の場合 → I7 へ進む
- NEEDS_REVISION の場合 → I6 へ進む

#### I6. レビュー対応（→ I5 に戻る）
reviewer から NEEDS_REVISION の通知を受けた場合、通知に含まれるレビュー結果のファイルパスから指摘内容を読み込み、対応する。

- must: コードを修正する
- imo: 採用するか判断し、採用する場合は修正、しない場合は理由を回答する
- question: 質問に回答する。質問が出たこと自体が分かりにくさの兆候かもしれないため、回答に加えてコードや命名の改善も検討する

対応後、実装結果ファイルに対応内容（修正箇所、imo判断の理由、質問への回答）を追記する。reviewer が status_check で修正完了を検知するので、I5 の待機に戻る。

#### I7. 作業完了後の待機
レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。リーダーやチームメンバーからフィードバック付きの修正依頼が届く場合があるため、メッセージを受信したら対応する。shutdown_request を受けたら shutdown_response（approve）を返して終了する。

### status_check への応答ルール
作業中のどの時点でも、reviewer から \`{type: "status_check"}\` を受信する場合がある。受信したら現在の状況を即座に返信する:

- \`{status: "working"}\` — まだ作業中
- \`{status: "done", path: "{実装結果ファイルパス}"}\` — 作業完了またはレビュー指摘への対応完了。レビュー可能
- \`{status: "blocked", reason: "{理由}"}\` — ブロックされている

---

## reviewer の作業内容

### 役割
実装の経緯を知らない第三者の視点で、コードレビューを行う。

### 手順

#### V1. 作業完了のポーリング
implementer に SendMessage で \`{type: "status_check"}\` を送信し、返信を待つ。

- \`{status: "working"}\` → 2分待ってから再度 status_check を送信（V1 を繰り返す）
- \`{status: "done", path: "..."}\` → V2 へ進む
- \`{status: "blocked", reason: "..."}\` → リーダーに報告し、V1 を繰り返す

#### V2. 実装計画と差分の読み込み
通知されたパスから実装結果を読み込む。実装結果に記載された実装計画のパスから計画も読み込む。
\`git diff\` で変更差分を取得する。

#### V3. レビュー
以下の観点でレビューする:

計画との整合性:
- 計画にある変更がすべて実装されているか
- 計画にない変更が含まれていないか

コード品質:
- 可読性: 変数名・関数名は明確か、処理の意図が読み取れるか
- 重複: 同じ処理が複数箇所にないか
- 複雑度: 不必要に複雑な実装になっていないか

正確性:
- エッジケース: 境界値・null・空配列等の考慮漏れ
- エラーハンドリング: 外部境界（ユーザー入力、API）での適切な処理
- 型安全性: 型の不整合やany型の安易な使用

セキュリティ:
- インジェクション（SQL, XSS, コマンド）の危険性
- セキュアな情報のハードコーディング
- 入力バリデーションの不足

テスト:
- テストの網羅性: 受入条件がすべてテストされているか
- エッジケースのテスト有無
- テストが3A形式で記述されているか

#### V4. レビュー結果の保存と通知
レビュー結果を \`~/claude-code-data/workflows/{タスクID}/review-result.md\` に保存する。

ファイルのフォーマット:
\`\`\`markdown
## レビュー結果

### 判定: {PASS / NEEDS_REVISION}

### 指摘事項
（NEEDS_REVISIONの場合のみ）

#### [{種別: must/imo/question}][{重要度: critical/major/minor}] {指摘の概要}
- must: 変えないと問題がある指摘
- imo: 問題はないが自分ならこうする、という提案
- question: 意図や背景の確認（回答によっては指摘に変わる可能性がある）
- ファイル: {ファイルパス}:{行番号}
- 問題: {何が問題か}
- 方向性: {どういう方向で見直すべきか。答えが明確な場合（1行の修正等）のみ具体的な修正を書いてよい}

### 良い点
- {良かった実装の点}
\`\`\`

保存後、implementer と リーダー（team lead）の両方に SendMessage で通知する。SendMessage には判定結果（PASS / NEEDS_REVISION）とファイルパスのみを含める。

- NEEDS_REVISION を送った場合 → V5 へ進み、implementer の修正通知を待つ
- PASS を送った場合 → V6 へ進む

#### V5. 修正完了のポーリング（→ V2 に戻る）
NEEDS_REVISION 送信後、implementer の修正完了を確認する。V1 と同じ要領で status_check を送信し、\`{status: "done"}\` を受け取ったら V2 に戻って再レビューする。レビュー結果は同じファイルパスに上書き保存する。

#### V6. 作業完了後の待機
レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。shutdown_request を受けたら shutdown_response（approve）を返して終了する。

注意:
- 実装の経緯は知らない前提でレビューする。計画と差分だけを見る
- 指摘は具体的に。ファイルパスと行番号を必ず含める
- セキュアな情報を出力に含めない
- shutdown_request が届くまで自発的に作業完了としないこと`,
});

export default implementTeamSkill;
