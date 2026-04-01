// dev-lite スキル: 軽量版devワークフロー

import { EntryPointSkill, tool } from "../../../../../../app/lib/types";
import type { SupportFile } from "../../../../../../app/lib/types";
import implementTeamSkill from "../implement-team/skill";
import { generateTaskId, createBranch } from "../shared-steps";

const planFormatFile: SupportFile = {
  role: "TEMPLATE",
  filename: "plan-format.md",
  sortOrder: 1,
};

const devLiteSkill = new EntryPointSkill({
  name: "dev-lite",
  description:
    "ユーザー指示から実装・レビュー・draft PR作成を簡易ステップで行う軽量版dev",
  argumentHint: "[説明]",
  userInvocable: true,
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
  steps: [
    generateTaskId,
    createBranch,
    {
      inline: "簡易Plan生成",
      steps: [
        {
          id: "1",
          title: "指示内容の分析",
          body: "ユーザーの指示内容を分析し、必要に応じてコードベースを簡単に確認する（Grep/Glob で関連ファイルを特定）。",
        },
        {
          id: "2",
          title: "plan.md の書き出し",
          body: "`~/claude-code-data/workflows/{タスクID}/plan.md` に [plan-format.md](plan-format.md) のフォーマットで実装計画を書き出す。",
        },
        {
          id: "3",
          title: "パス記録",
          body: "実装計画の保存先パスを記録し、後続のステップに渡す。コードベースの深い調査は不要。plan review やユーザー承認は行わない。",
        },
      ],
    },
    implementTeamSkill,
  ],
  sections: [
    {
      heading: "確認のスキップ",
      body: "最終的にユーザーはPRでレビューするため、中間の確認はすべて省略してそのまま次のステップに進む。",
      position: "after-steps",
    },
    {
      heading: "注意事項",
      body: `- 各ステップで問題が発生した場合はユーザーに報告して判断を仰ぐ
- Linearチケットは作成・更新しない（Quick mode）
- ユーザーからアプローチの変更提案があった場合は、即座に作業を中断し、plan.mdを修正してから再開する
- メインエージェント（リーダー）は、teammateやsubAgentが担当すべき作業（実装・レビュー・PR作成など）を自分で実行しないこと。リーダーの役割は進行管理・指示・監視のみ`,
      position: "after-steps",
    },
    {
      heading: "ステップ間の情報受け渡し",
      body: "ステップ間の情報受け渡しは会話コンテキストではなくファイルを介して行う。会話コンテキストの肥大化を防ぎ、後続ステップが必要な情報だけを選択的に読めるようにする。",
      position: "after-steps",
    },
  ],
  files: [planFormatFile],
});

export default devLiteSkill;
