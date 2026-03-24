// create-pr スキル: 実装済みコードのGitHub PR作成

import { WorkerWithSubAgent } from "../../../../app/lib/types";

const createPrSkill = new WorkerWithSubAgent({
  name: "create-pr",
  description:
    "実装済みのコードからブランチを作成し、GitHub PRを作成するスキル。PRの本文はLinearチケットの内容から自動生成する。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Grep",
    "Glob",
    "Bash(git *)",
    "Bash(gh *)",
    "Task",
    "ToolSearch",
    "mcp__plugin_linear_linear__get_issue",
  ],
  files: [
    { role: "TEMPLATE", filename: "template.md", sortOrder: 1 },
  ],
  agentConfig: {
    model: "sonnet",
    tools: [
      "Read",
      "Grep",
      "Glob",
      "Bash(git *)",
      "Bash(gh *)",
      "ToolSearch",
    ],
    content: `実装内容をGitHub PRとして提出するエージェント。

## 入力

- チケットID
- 実装計画のパス（orchestrator から渡される）
- 実装結果のパス（orchestrator から渡される、渡されない場合がある）
- ベースブランチ情報のパス（orchestrator から渡される）

## 実行

create-pr skill の手順に従って実行する。

- 機密ファイルをコミットに含めない

## セキュリティ

セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。`,
  },
  content: `# Create PR

実装内容をGitHub PRとして提出する。

## 入力

- チケットID（例: \`LIN-123\`）。実装が完了済みであること
- plan.md のパス（orchestrator から渡される）
- implement-result.md のパス（orchestrator から渡される、渡されない場合がある）
- base-branch.txt のパス（orchestrator から渡される）

## 手順

### 0. 事前情報の読み込み

入力として渡されたパスからファイルを読み込み、実装内容を把握する:
- plan.md（必須）
- implement-result.md（渡された場合のみ）

### 1. チケット情報取得

Linear MCPの \`get_issue\` でチケットのtitle, description, identifierを取得する。

### 2. コミット

現在のブランチ（devによって事前に作成済み）で変更をコミットする。

- 変更をステージング（機密ファイルを除外）
- コミットメッセージ: \`{チケットID}: {変更の要約}\`
- リモートにプッシュ

### 3. PR作成

\`gh pr create --draft\` でドラフトPRを作成する。
入力として渡された base-branch.txt のパスを読み込み、\`--base {ベースブランチ}\` を指定してPRのマージ先を明示する。
作成後、\`gh pr edit --add-reviewer\` で作業者（自分）をレビュアーにアサインする。

PRタイトル: \`{チケットID}: {チケットタイトル}\`（タイトルにチケットIDを含めることでLinearと自動紐づけされる。descriptionにLinearリンクは不要）

PR本文は [template.md](template.md) のフォーマットに従う。

#### PR本文の書き方

PR本文の読み手はレビュアーである。コードの差分は読めば分かるので、PR本文には差分からは読み取れない情報だけを書く。

- Why: チケットの背景課題を簡潔に説明する
- What: 実装アプローチの要約を3〜5行で書く。コードの具体的な変更内容（ファイル名、メソッド名、フィールド追加など）は書かない。差分を見れば分かることを繰り返さない。以下の観点に絞る:
  - 採用したアプローチとその理由（「既存の〇〇と同じパターンで実装した」など）
  - 代替案を選ばなかった理由（あれば）
  - レビュアーが差分を読む前に知っておくべき前提知識
- レビュー時の確認ポイント: レビュアーが手動で確認すべき項目をチェックリスト形式で書く。単体テスト通過・typecheck通過などCI/CDで自動検証される項目は書かない。以下のような人間の判断が必要な項目に絞る:
  - 特定の画面・操作での動作確認（「〇〇画面で△△を実行し、□□が表示されること」）
  - エッジケースの確認（「〇〇が空の場合の挙動」）
  - 既存機能へのデグレ確認（「〇〇機能が従来通り動くこと」）
  - パフォーマンスやUXの観点での確認
  - 各項目は確認手順が明確であること。「問題がないこと」「適切であること」のような作業者の判断に委ねる曖昧な表現は避け、「〇〇画面で△△を実行し、□□が表示されること」のように具体的な操作と期待結果を書く

### 既存PRへの追加push時

PRが既に作成済みの状態で追加のコミットをpushした場合は、\`gh pr edit\` でPR本文を最新の変更内容に合わせて更新する。
- 全コミットの変更を踏まえた「What / 変更内容」セクションにする（アプローチの要約を3〜5行で。コードの具体的な変更内容は書かない）
- 後から判明した情報があれば「Why / 背景」に追記する

### 複数リポジトリの場合

複数リポジトリにまたがる変更では、PR本文に相互参照と依存関係を明記する:

#### 依存される側（先にmergeすべきPR）

\`\`\`markdown
## Related
- 関連PR: {依存する側のPR URL}
\`\`\`

#### 依存する側

\`\`\`markdown
## Related
- 依存PR: {依存される側のPR URL}
  - ⚠️ こちらのPRを先にmergeしてください
\`\`\`

### 4. 結果報告

ユーザーに以下を報告する:
- PRのURL
- PRの概要
- Linearチケットへのリンク`,
});

export default createPrSkill;
