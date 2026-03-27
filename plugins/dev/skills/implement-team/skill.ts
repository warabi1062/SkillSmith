// implement-team スキル: Agent Teamでimplementer/reviewerを編成し、コード実装とレビューを行う

import { WorkerWithAgentTeam, tool } from "../../../../app/lib/types";
import type { Teammate, SupportFile } from "../../../../app/lib/types";

const templateResult: SupportFile = { role: "TEMPLATE", filename: "template-result.md", sortOrder: 1 };
const reviewResultFormat: SupportFile = { role: "REFERENCE", filename: "review-result-format.md", sortOrder: 2 };

const implementer: Teammate = {
  name: "implementer",
  role: "実装計画に従ってコードを実装し、テストを書く。",
  sortOrder: 1,
  communicationPattern: { type: "responder" },
  steps: [
    {
      id: "I1",
      title: "実装計画の読み込み",
      body: "入力として渡された実装計画のパスを読み込み、実装ステップ・変更ファイル・テスト計画を把握する。",
    },
    {
      id: "I2",
      title: "実装",
      body: `計画のコミット計画に従い、コミット単位で実装を進める。
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
- TypeScriptの場合はLSPで型エラーがないことを確認`,
    },
    {
      id: "I3",
      title: "セルフチェック",
      body: `実装完了後、自身で以下を確認する:
- 計画通りに実装できたか
- 計画にない変更が発生した場合、その理由を記録
- テストがすべてpassするか
- 明らかなコード品質の問題がないか

問題があれば修正してから完了とする。`,
    },
    {
      id: "I4",
      title: "結果の保存",
      body: `\`~/claude-code-data/workflows/{タスクID}/implement-result.md\` に [${templateResult.filename}](${templateResult.filename}) 形式で結果を書き出す。`,
    },
    {
      id: "I5",
      title: "reviewer からのレビュー結果を待つ",
      body: `実装結果を保存したら、reviewer からの連絡を待つ。reviewer が status_check で状況を確認してくるので、応答する（後述の「status_check への応答ルール」参照）。

reviewer からレビュー結果を受け取ったら:
- PASS の場合 → I7 へ進む
- NEEDS_REVISION の場合 → I6 へ進む`,
    },
    {
      id: "I6",
      title: "レビュー対応（→ I5 に戻る）",
      body: `reviewer から NEEDS_REVISION の通知を受けた場合、通知に含まれるレビュー結果のファイルパスから指摘内容を読み込み、対応する。

- must: コードを修正する
- imo: 採用するか判断し、採用する場合は修正、しない場合は理由を回答する
- question: 質問に回答する。質問が出たこと自体が分かりにくさの兆候かもしれないため、回答に加えてコードや命名の改善も検討する

対応後、実装結果ファイルに対応内容（修正箇所、imo判断の理由、質問への回答）を追記する。reviewer が status_check で修正完了を検知するので、I5 の待機に戻る。`,
    },
    {
      id: "I7",
      title: "作業完了後の待機",
      body: "レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。リーダーやチームメンバーからフィードバック付きの修正依頼が届く場合があるため、メッセージを受信したら対応する。shutdown_request を受けたら shutdown_response（approve）を返して終了する。",
    },
  ],
};

const reviewer: Teammate = {
  name: "reviewer",
  role: "実装の経緯を知らない第三者の視点で、コードレビューを行う。",
  sortOrder: 2,
  communicationPattern: { type: "poller", target: "implementer" },
  steps: [
    {
      id: "V1",
      title: "作業完了のポーリング",
      body: `implementer に SendMessage で \`{type: "status_check"}\` を送信し、返信を待つ。

- \`{status: "working"}\` → 2分待ってから再度 status_check を送信（V1 を繰り返す）
- \`{status: "done", path: "..."}\` → V2 へ進む
- \`{status: "blocked", reason: "..."}\` → リーダーに報告し、V1 を繰り返す`,
    },
    {
      id: "V2",
      title: "実装計画と差分の読み込み",
      body: "通知されたパスから実装結果を読み込む。実装結果に記載された実装計画のパスから計画も読み込む。\n`git diff` で変更差分を取得する。",
    },
    {
      id: "V3",
      title: "レビュー",
      body: `以下の観点でレビューする:

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
- テストが3A形式で記述されているか`,
    },
    {
      id: "V4",
      title: "レビュー結果の保存と通知",
      body: `レビュー結果を \`~/claude-code-data/workflows/{タスクID}/review-result.md\` に保存する。

ファイルのフォーマット: [${reviewResultFormat.filename}](${reviewResultFormat.filename})

保存後、implementer と リーダー（team lead）の両方に SendMessage で通知する。SendMessage には判定結果（PASS / NEEDS_REVISION）とファイルパスのみを含める。

- NEEDS_REVISION を送った場合 → V5 へ進み、implementer の修正通知を待つ
- PASS を送った場合 → V6 へ進む`,
    },
    {
      id: "V5",
      title: "修正完了のポーリング（→ V2 に戻る）",
      body: "NEEDS_REVISION 送信後、implementer の修正完了を確認する。V1 と同じ要領で status_check を送信し、`{status: \"done\"}` を受け取ったら V2 に戻って再レビューする。レビュー結果は同じファイルパスに上書き保存する。",
    },
    {
      id: "V6",
      title: "作業完了後の待機",
      body: `レビューPASS後も、shutdown_request が届くまで自発的に作業完了としない。idle状態になるのは正常（メッセージ受信で自動復帰する）。shutdown_request を受けたら shutdown_response（approve）を返して終了する。

注意:
- 実装の経緯は知らない前提でレビューする。計画と差分だけを見る
- 指摘は具体的に。ファイルパスと行番号を必ず含める
- セキュアな情報を出力に含めない
- shutdown_request が届くまで自発的に作業完了としないこと`,
    },
  ],
};

const implementTeamSkill = new WorkerWithAgentTeam({
  name: "implement-team",
  description:
    "Agent Teamでimplementer/reviewerを編成し、コード実装とレビューを行う。ワークフローの一部として使用される。",
  input: "- タスクID\n- 実装計画のパス",
  output: "- 実装結果のパス",
  allowedTools: [
    tool("Read"),
    tool("Write"),
    tool("Edit"),
    tool("Glob"),
    tool("Grep"),
    tool("Bash"),
    tool("Task"),
    tool("AskUserQuestion"),
    tool("ToolSearch"),
  ],
  files: [templateResult, reviewResultFormat],
  teammates: [implementer, reviewer],
  teamPrefix: "impl",
});

export default implementTeamSkill;
