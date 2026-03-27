// create-pr スキル: 実装済みコードのGitHub PR作成

import { WorkerWithSubAgent, tool, bash, mcp } from "../../../../app/lib/types";

const createPrSkill = new WorkerWithSubAgent({
  name: "create-pr",
  description:
    "実装済みのコードからブランチを作成し、GitHub PRを作成するスキル。PRの本文はLinearチケットの内容から自動生成する。ワークフローの一部として使用される。",
  input: `- チケットID（例: \`LIN-123\`）。実装が完了済みであること
- plan.md のパス（orchestrator から渡される）
- implement-result.md のパス（orchestrator から渡される、渡されない場合がある）
- base-branch.txt のパス（orchestrator から渡される）`,
  allowedTools: [
    tool("Read"),
    tool("Grep"),
    tool("Glob"),
    bash("git *"),
    bash("gh *"),
    tool("Task"),
    tool("ToolSearch"),
    mcp("plugin_linear_linear", "get_issue"),
  ],
  files: [
    { role: "TEMPLATE", filename: "template.md", sortOrder: 1 },
  ],
  agentConfig: {
    model: "sonnet",
    tools: [
      tool("Read"),
      tool("Grep"),
      tool("Glob"),
      bash("git *"),
      bash("gh *"),
      tool("ToolSearch"),
    ],
    content: "",
    description: "実装内容をGitHub PRとして提出するエージェント。",
    sections: [
      {
        heading: "セキュリティ",
        body: "セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。\n機密ファイルをコミットに含めない。",
        position: "after-steps",
      },
    ],
  },
  workerSteps: [
    {
      id: "0",
      title: "事前情報の読み込み",
      body: `入力として渡されたパスからファイルを読み込み、実装内容を把握する:
- plan.md（必須）
- implement-result.md（渡された場合のみ）`,
    },
    {
      id: "1",
      title: "チケット情報取得",
      body: "Linear MCPの `get_issue` でチケットのtitle, description, identifierを取得する。",
    },
    {
      id: "2",
      title: "コミット",
      body: `現在のブランチ（devによって事前に作成済み）で変更をコミットする。

- 変更をステージング（機密ファイルを除外）
- コミットメッセージ: \`{チケットID}: {変更の要約}\`
- リモートにプッシュ`,
    },
    {
      id: "3",
      title: "PR作成",
      bodyFile: "step-pr-creation.md",
    },
    {
      id: "3a",
      title: "既存PRへの追加push時",
      body: `PRが既に作成済みの状態で追加のコミットをpushした場合は、\`gh pr edit\` でPR本文を最新の変更内容に合わせて更新する。
- 全コミットの変更を踏まえた「What / 変更内容」セクションにする（アプローチの要約を3〜5行で。コードの具体的な変更内容は書かない）
- 後から判明した情報があれば「Why / 背景」に追記する`,
    },
    {
      id: "3b",
      title: "複数リポジトリの場合",
      body: `複数リポジトリにまたがる変更では、PR本文に相互参照と依存関係を明記する:

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
\`\`\``,
    },
    {
      id: "4",
      title: "結果報告",
      body: `ユーザーに以下を報告する:
- PRのURL
- PRの概要
- Linearチケットへのリンク`,
    },
  ],
});

export default createPrSkill;
