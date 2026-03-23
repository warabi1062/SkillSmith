// linear-manage スキル: Linearチケットの新規作成・修正・情報補完・スコープ分割

import { EntryPointSkill } from "../../../../app/lib/types";

const linearManageSkill = new EntryPointSkill({
  name: "linear-manage",
  description:
    "Linearチケットを新規作成・修正し、情報補完・スコープ分割まで行うタスク整理スキル。実装は行わず、チケットを実装可能な状態に整える。",
  argumentHint: "[LINEAR_ISSUE_ID or 概要]",
  allowedTools: [
    "Read",
    "Write",
    "Task",
    "ToolSearch",
    "AskUserQuestion",
    "mcp__plugin_linear_linear__get_issue",
    "mcp__plugin_linear_linear__create_issue",
    "mcp__plugin_linear_linear__update_issue",
    "mcp__plugin_linear_linear__list_teams",
    "mcp__plugin_linear_linear__list_issue_labels",
    "mcp__plugin_linear_linear__list_projects",
  ],
  dependencies: ["linear-triage", "linear-triage-review", "linear-triage-execute"],
  files: [
    { role: "TEMPLATE", filename: "templates/bug.md", sortOrder: 1 },
    { role: "TEMPLATE", filename: "templates/feature.md", sortOrder: 2 },
    { role: "TEMPLATE", filename: "templates/task.md", sortOrder: 3 },
  ],
  content: `# Linear Manage

Linearチケットを新規作成または修正し、情報補完・スコープ分割まで行う。
実装は行わず、チケットを実装可能な状態に整える「タスク整理」スキル。

## 入力判定

\`$ARGUMENTS\` が \`^[A-Z]+-\\d+$\` にマッチする場合（例: LIN-123）は **既存チケット**、それ以外は **新規作成** として処理する。

\`\`\`
[入力判定]
    │
    ├── 新規作成 ──→ [チケット作成] → [Triage] → [Triage Review] → [ユーザー承認] → [Triage Execute] → [結果報告]
    │
    └── 既存チケット ──→ [Triage] → [Triage Review] → [ユーザー承認] → [Triage Execute] → [結果報告]
\`\`\`

---

## 新規作成ステップ

### Step N1: チケット種類の確認

AskUserQuestionで以下を確認する:
- チケット種類: Bug / Feature / Task

### Step N2: テンプレート適用・チケット作成

1. \`templates/\` 配下の該当テンプレートファイルを読み込む
   - Bug: \`templates/bug.md\`
   - Feature: \`templates/feature.md\`
   - Task: \`templates/task.md\`
2. \`list_teams\` でチーム一覧を取得し、対象チームを選択
3. \`list_issue_labels\` でラベル一覧を取得し、適切なラベルを付与
4. \`list_projects\` でプロジェクト一覧を取得し、関連プロジェクトを選択（任意）
5. \`create_issue\` でチケットを作成

必須項目:
- title: チケットタイトル（Bugの場合は \`[💣]\` プレフィックス推奨）
- teamId: チームID
- description: テンプレートに基づいた説明文
- labelIds: ラベルID（Bug, Frontend, Backend等）

---

## 共通ステップ

以下は新規作成・既存チケットの両方で実行する。

### Step 1: Triage（調査・計画）

Taskツールを subagent_type: triage-agent で呼び出し、チケットの調査・計画作成を委譲する。

渡す情報:
- チケットID

出力:
- \`~/claude-code-data/workflows/{チケットID}/triage-plan.md\`
- triage-agent の agent_id

### Step 2: Triage Review（計画レビュー）

Taskツールを subagent_type: triage-review-agent で呼び出し、計画のレビューを委譲する。

渡す情報:
- チケットID

出力:
- レビュー結果（PASS / NEEDS_REVISION）
- triage-review-agent の agent_id

NEEDS_REVISIONの場合、Step 1 で取得した triage-agent の agent_id に対して SendMessage(to: agent_id) で指摘を渡し修正させる。
修正後、Step 2 で取得した triage-review-agent の agent_id に対して SendMessage(to: agent_id) で再レビューする。
**このサイクルは最大3回まで繰り返す。** 3回で解決しない場合はユーザーに報告して判断を仰ぐ。

**注意: SendMessage はオーケストレーター（メインスレッド）が直接呼び出すこと。Agentツールで別のagentに委譲してはならない。**

### Step 3: ユーザー承認

レビューPASSした計画（\`triage-plan.md\`）の内容をユーザーに提示し、承認を得る。
フィードバックがあれば triage-agent の agent_id に対して SendMessage(to: agent_id) で修正を依頼する。

### Step 4: Triage Execute（計画実行）

Taskツールを subagent_type: triage-execute-agent で呼び出し、承認済み計画の実行を委譲する。

渡す情報:
- チケットID

出力:
- \`~/claude-code-data/workflows/{チケットID}/triage-result.md\`

### Step 5: 結果報告

ユーザーに以下を報告する:
- 作成・更新したチケットのURL
- triage結果サマリー
- 分割結果（分割した場合はサブチケット一覧）
- 次のアクション: \`/dev {チケットID}\` で実装開始可能`,
});

export default linearManageSkill;
