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

reviewer は implementer の実装完了を待つ必要があるため、起動時に「implementer の実装が完了したら SendMessage で通知が届く。届くまで待機せよ」と指示する。

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

#### I5. reviewer に通知
実装結果の保存先パスを reviewer に SendMessage で通知する。SendMessage には完了ステータスとファイルパスのみを含める。

#### I6. レビュー対応
reviewer から NEEDS_REVISION の通知を受けた場合、通知に含まれるレビュー結果のファイルパスから指摘内容を読み込み、コードを修正する。修正後、reviewer に SendMessage でファイルパスと修正完了の旨のみを通知する。

---

## reviewer の作業内容

### 役割
実装の経緯を知らない第三者の視点で、コードレビューを行う。

### 手順

#### V1. 実装結果の受領待ち
implementer から実装結果の保存先パスが SendMessage で届くまで待機する。

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

#### [{重要度: critical/major/minor}] {指摘の概要}
- ファイル: {ファイルパス}:{行番号}
- 問題: {何が問題か}
- 提案: {どう修正すべきか}

### 良い点
- {良かった実装の点}
\`\`\`

保存後、implementer と リーダー（team lead）の両方に SendMessage で通知する。SendMessage には判定結果（PASS / NEEDS_REVISION）とファイルパスのみを含める。

#### V5. 再レビュー
implementer から修正通知を受けたら、再度 \`git diff\` を取得してレビューする（V2 に戻る）。レビュー結果は同じファイルパスに上書き保存する。

注意:
- 実装の経緯は知らない前提でレビューする。計画と差分だけを見る
- 指摘は具体的に。ファイルパスと行番号を必ず含める
- セキュアな情報を出力に含めない`,
});

export default implementTeamSkill;
