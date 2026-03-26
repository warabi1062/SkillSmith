// linear-triage-execute スキル: 承認済みtriage計画に基づくチケット更新・サブチケット作成

import { WorkerWithSubAgent } from "../../../../app/lib/types";

const linearTriageExecuteSkill = new WorkerWithSubAgent({
  name: "linear-triage-execute",
  description:
    "承認済みのtriage計画に基づきチケット更新・サブチケット作成を実行するスキル。ワークフローの一部として使用される。",
  input: `- チケットID（例: \`LIN-123\`）
- triage-plan.md のパス（orchestrator から渡される）`,
  output: "triage結果の保存先パス",
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
    content: "",
    description: "承認済みのtriage計画に基づいてチケット更新・サブチケット作成を実行するエージェント。",
    sections: [
      {
        heading: "セキュリティ",
        body: "セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。",
        position: "after-steps",
      },
    ],
  },
  workerSteps: [
    {
      id: "1",
      title: "計画の読み込み",
      body: "入力として渡された triage-plan.md のパスを読み込む。",
    },
    {
      id: "2",
      title: "チケット更新",
      body: "Linear MCPの `update_issue` でチケットのdescriptionを計画の「チケット更新案」の内容に更新する。",
    },
    {
      id: "3",
      title: "サブチケット作成（分割計画がある場合）",
      body: `分割計画に基づき \`create_issue\` で各サブチケットを作成する:

- 元チケットを親に設定（\`parentId\`）
- 各サブチケットに計画通りのtitle, descriptionを設定
- 元チケットのlabels, priority, assigneeを継承
- 依存関係を設定（\`blockedBy\`）`,
    },
    {
      id: "4",
      title: "元チケット更新（分割した場合）",
      body: `元チケットのdescriptionに分割計画を追記する:

\`\`\`markdown
## 分割計画
このチケットは以下のサブチケットに分割されました:
1. {ID}: {サブタスク1の概要}
2. {ID}: {サブタスク2の概要}
\`\`\``,
    },
    {
      id: "5",
      title: "結果の保存",
      body: "`~/claude-code-data/workflows/{チケットID}/triage-result.md` に [template-result.md](template-result.md) 形式で結果を書き出す。",
    },
    {
      id: "6",
      title: "結果返却",
      body: `以下の情報を返す:
- チケット更新の完了状況
- 分割したかどうか
- 分割した場合: サブチケットのID一覧と最初に着手すべきチケットID
- 分割しなかった場合: 元のチケットIDをそのまま返す
- triage-result.md の保存先パス`,
    },
  ],
});

export default linearTriageExecuteSkill;
