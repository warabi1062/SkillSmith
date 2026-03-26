// linear-manage スキル: Linearチケットの新規作成・修正・情報補完・スコープ分割

import { EntryPointSkill } from "../../../../app/lib/types";
import linearTriageTeamSkill from "../linear-triage-team/skill";
import linearTriageExecuteSkill from "../linear-triage-execute/skill";

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
  steps: [
    {
      decisionPoint: "入力判定",
      description: "`$ARGUMENTS` が `^[A-Z]+-\\d+$` にマッチする場合（例: LIN-123）は **既存チケット**、それ以外は **新規作成** として処理する。",
      cases: {
        "新規作成": [
          {
            inline: "チケット種類確認",
            steps: [
              {
                id: "1",
                title: "種類ヒアリング",
                body: "AskUserQuestionでチケット種類（Bug / Feature / Task）を確認する。",
              },
            ],
            tools: ["AskUserQuestion"],
          },
          {
            inline: "テンプレート適用・チケット作成",
            steps: [
              {
                id: "1",
                title: "テンプレート読み込み",
                body: "`templates/` 配下の該当テンプレートファイル（Bug: `bug.md`, Feature: `feature.md`, Task: `task.md`）を読み込む。",
              },
              {
                id: "2",
                title: "メタデータ取得",
                body: "`list_teams` でチーム一覧、`list_issue_labels` でラベル一覧、`list_projects` でプロジェクト一覧を取得する。",
              },
              {
                id: "3",
                title: "チケット作成",
                body: "`create_issue` でチケットを作成する。必須項目: title, teamId, description（テンプレートベース）, labelIds。",
              },
            ],
            tools: [
              "Read",
              "mcp__plugin_linear_linear__list_teams",
              "mcp__plugin_linear_linear__list_issue_labels",
              "mcp__plugin_linear_linear__list_projects",
              "mcp__plugin_linear_linear__save_issue",
            ],
          },
        ],
        "既存チケット": [],
      },
    },
    linearTriageTeamSkill,
    linearTriageExecuteSkill,
  ],
  files: [
    { role: "TEMPLATE", filename: "templates/bug.md", sortOrder: 1 },
    { role: "TEMPLATE", filename: "templates/feature.md", sortOrder: 2 },
    { role: "TEMPLATE", filename: "templates/task.md", sortOrder: 3 },
  ],
  sections: [
    {
      heading: "結果報告",
      body: `ユーザーに以下を報告する:
- 作成・更新したチケットのURL
- triage結果サマリー
- 分割結果（分割した場合はサブチケット一覧）
- 次のアクション: \`/dev {チケットID}\` で実装開始可能`,
      position: "after-steps",
    },
  ],
});

export default linearManageSkill;
