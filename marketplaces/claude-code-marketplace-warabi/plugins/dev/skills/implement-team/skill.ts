// implement-team スキル: Agent Teamでimplementer/reviewer/pr-creatorを編成し、コード実装・レビュー・PR作成を行う

import { WorkerWithAgentTeam, tool, mcp } from "../../../../../../app/lib/types";
import type { Teammate, SupportFile } from "../../../../../../app/lib/types";
import createPrSkill from "../create-pr/skill";

const templateResult: SupportFile = {
  role: "TEMPLATE",
  filename: "template-result.md",
  sortOrder: 1,
};
const reviewResultFormat: SupportFile = {
  role: "REFERENCE",
  filename: "template-review.md",
  sortOrder: 2,
};

const implementer: Teammate = {
  name: "implementer",
  role: "実装計画に従ってコードを実装し、テストを書く。親チケットや関連チケットを自主的に調べて追加実装しないこと。実装範囲はリーダーから渡された実装計画に記載された内容のみとする。",
  sortOrder: 1,
  steps: [
    {
      id: "I1",
      title: "実装計画の読み込み",
      body: "入力として渡された実装計画のファイルパスを読み込み、実装ステップ・変更ファイル・テスト計画を把握する。",
    },
    {
      id: "I2",
      title: "実装",
      body: `計画を参考に、コミット単位で実装を進める。
1つのコミットの実装が完了したらコミットし、次のコミットに進む。機密ファイル（.env、credentials等）はコミットに含めない。
やむを得ない理由（計画の考慮漏れの発覚、計画通りだとエラーになる等）がある場合は事前の計画にない実装を加えてよい。その場合は理由を記録する。

テスト:
- 3A形式（Arrange / Act / Assert）で記述
- Red-Green-Refactorサイクルで進める:
  1. 失敗するテストを書く
  2. テストが通る最小限の実装をする
  3. リファクタリングする

コード品質:
- 既存の設計パターンに従う
- TypeScriptの場合はLSPで型エラーがないことを確認`,
    },
    {
      id: "I3",
      title: "セルフチェック",
      body: `実装完了後、自身で以下を確認する:
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
      title: "reviewer に完了を通知する",
      body: "reviewer に実装が完了した旨と結果ファイルのパスを伝える。",
    },
    {
      id: "I6",
      title: "レビュー対応",
      body: `reviewer から NEEDS_REVISION を受け取った場合、通知に含まれるレビュー結果のファイルパスから指摘内容を読み込み、対応する。

- must: コードを修正する
- imo: 採用するか判断し、採用する場合は修正、しない場合は理由を回答する
- question: 質問に回答する。質問が出たこと自体が分かりにくさの兆候かもしれないため、回答に加えてコードや命名の改善も検討する

対応後、実装結果ファイルに対応内容（修正箇所、imo判断の理由、質問への回答）を追記する。reviewer に修正が完了した旨と結果ファイルのパスを伝える。`,
    },
  ],
};

const reviewer: Teammate = {
  name: "reviewer",
  role: "実装の経緯を知らない第三者の視点で、コードレビューを行う。問題点や理由を曖昧にせず具体的に指摘する。セキュアな情報を出力に含めない。",
  sortOrder: 2,
  steps: [
    {
      id: "V1",
      title: "実装計画と差分の読み込み",
      body: "implementer から通知されたファイルパスから実装結果を読み込む。実装結果に記載された実装計画のファイルパスから計画も読み込む。\n`git diff` で変更差分を取得する。",
    },
    {
      id: "V2",
      title: "レビュー",
      body: `以下の観点でレビューする:

計画との整合性:
- 計画にある変更がすべて実装されているか
- 計画にない変更が含まれている場合、やむを得ない理由が記録されており、その理由が妥当か

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
      id: "V3",
      title: "レビュー結果の保存",
      body: `レビュー結果を \`~/claude-code-data/workflows/{タスクID}/review-result.md\` に [${reviewResultFormat.filename}](${reviewResultFormat.filename}) 形式で保存する。`,
    },
    {
      id: "V4",
      title: "通知",
      body: `implementer と リーダー（team lead）の両方に判定結果（PASS / NEEDS_REVISION）とファイルパスを伝える。`,
    },
    {
      id: "V5",
      title: "再レビュー",
      body: "NEEDS_REVISION の場合、implementer がコードを修正したら V1 に戻って再レビューする。レビュー結果は同じファイルパスに上書き保存する。",
    },
  ],
};

const prCreator: Teammate = {
  name: "pr-creator",
  role: "実装・コミット済みのコードをプッシュし、GitHub PRを作成する。",
  sortOrder: 3,
  steps: [
    {
      id: "C1",
      title: "create-pr skill の実行",
      body: "create-pr skill を実行する。リーダーから受け取った実装計画のファイルパス、実装結果のファイルパス、ベースブランチ情報のファイルパス、モードを入力として渡す。完了後、リーダーにPR URLを伝える。",
    },
  ],
};

const implementTeamSkill = new WorkerWithAgentTeam({
  name: "implement-team",
  description:
    "Agent Teamでimplementer/reviewerを編成し、コード実装とレビューを行う。ワークフローの一部として使用される。",
  input: [
    "タスクID",
    "モード（Linear / Quick）",
    "実装計画のファイルパス",
    "ベースブランチ情報のファイルパス",
  ],
  output: ["実装結果のファイルパス", "PR URL"],
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
    mcp("plugin_linear_linear", "get_issue"),
  ],
  files: [templateResult, reviewResultFormat],
  teammates: [implementer, reviewer, prCreator],
  teamPrefix: "impl",
  additionalLeaderSteps: [
    "レビューPASS後、pr-creator に実行を指示する（実装計画のファイルパス、実装結果のファイルパス、ベースブランチ情報のファイルパス、モードを伝える）",
    "pr-creator から完了通知を受け取り、PR URLを記録する",
  ],
  dependencies: [createPrSkill],
});

export default implementTeamSkill;
