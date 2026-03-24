// linear-triage-execute スキル: 承認済みtriage計画に基づくチケット更新・サブチケット作成

import { WorkerWithSubAgent } from "../../../../app/lib/types";

const linearTriageExecuteSkill = new WorkerWithSubAgent({
  name: "linear-triage-execute",
  description:
    "承認済みのtriage計画に基づきチケット更新・サブチケット作成を実行するスキル。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Write",
    "ToolSearch",
    "mcp__plugin_linear_linear__get_issue",
    "mcp__plugin_linear_linear__update_issue",
    "mcp__plugin_linear_linear__create_issue",
    "mcp__plugin_linear_linear__list_issues",
  ],
  files: [
    { role: "TEMPLATE", filename: "template-result.md", sortOrder: 1 },
  ],
  agentConfig: {
    model: "sonnet",
    tools: ["Read", "Write", "ToolSearch"],
    content: `承認済みのtriage計画に基づいてチケット更新・サブチケット作成を実行するエージェント。

## 入力

- チケットID
- triage計画のパス（orchestrator から渡される）

## 出力

- triage結果の保存先パス

## 実行

linear-triage-execute skill の手順に従って実行する。

## セキュリティ

セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。`,
  },
  content: `# Linear Triage Execute

承認済みの \`triage-plan.md\` に基づいてチケット更新・サブチケット作成を実行する。

## 入力

- チケットID（例: \`LIN-123\`）
- triage-plan.md のパス（orchestrator から渡される）

## 手順

### 1. 計画の読み込み

入力として渡された triage-plan.md のパスを読み込む。

### 2. チケット更新

Linear MCPの \`update_issue\` でチケットのdescriptionを計画の「チケット更新案」の内容に更新する。

### 3. サブチケット作成（分割計画がある場合）

分割計画に基づき \`create_issue\` で各サブチケットを作成する:

- 元チケットを親に設定（\`parentId\`）
- 各サブチケットに計画通りのtitle, descriptionを設定
- 元チケットのlabels, priority, assigneeを継承
- 依存関係を設定（\`blockedBy\`）

### 4. 元チケット更新（分割した場合）

元チケットのdescriptionに分割計画を追記する:

\`\`\`markdown
## 分割計画
このチケットは以下のサブチケットに分割されました:
1. {ID}: {サブタスク1の概要}
2. {ID}: {サブタスク2の概要}
\`\`\`

### 5. 結果の保存

\`~/claude-code-data/workflows/{チケットID}/triage-result.md\` に [template-result.md](template-result.md) 形式で結果を書き出す。

### 6. 結果返却

以下の情報を返す:
- チケット更新の完了状況
- 分割したかどうか
- 分割した場合: サブチケットのID一覧と最初に着手すべきチケットID
- 分割しなかった場合: 元のチケットIDをそのまま返す
- triage-result.md の保存先パス`,
});

export default linearTriageExecuteSkill;
