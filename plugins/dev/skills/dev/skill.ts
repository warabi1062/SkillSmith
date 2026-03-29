// dev スキル: Linearチケットまたはユーザー指示から実装計画・実装・PR作成を自動で行う

import { EntryPointSkill, tool } from "../../../../app/lib/types";
import linearTriageTeamSkill from "../linear-triage-team/skill";
import planTeamSkill from "../plan-team/skill";
import implementTeamSkill from "../implement-team/skill";
import { generateTaskId, createBranch } from "../shared-steps";

const devSkill = new EntryPointSkill({
  name: "dev",
  description:
    "Linearチケットまたはユーザー指示から実装計画・実装・PR作成を自動で行う",
  argumentHint: "[LINEAR_ISSUE_ID or 説明]",
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
    {
      decisionPoint: "入力判定",
      description: `以下の順序で判定する:

1. Linear URLを含む（\`linear.app\` を含むURLパターン）→ Linearモード
2. \`^[A-Z]+-\\d+$\` にマッチ（例: LIN-123, PROJ-456）→ Linearモード
3. それ以外 → Quickモード`,
      cases: {
        Linearモード: [linearTriageTeamSkill],
        Quickモード: [generateTaskId],
      },
    },
    createBranch,
    planTeamSkill,
    implementTeamSkill,
  ],
  sections: [
    {
      heading: "確認のスキップ",
      body: "最終的にユーザーはPRでレビューするため、基本的には確認を省略してそのまま次のステップに進んでよい。設計判断の幅が大きく方向性の確認が重要なケースでは確認を取る。判断に迷う場合はスキップして進める。",
      position: "after-steps",
    },
    {
      heading: "注意事項",
      body: `- 各ステップで問題が発生した場合はユーザーに報告して判断を仰ぐ
- Quickモードの場合: Linearチケットは作成・更新しない
- ユーザーからplanの根幹に関わる提案・コメント（使用ツールの変更、アーキテクチャの変更、アプローチの変更など）があった場合は、即座に作業を中断し、planを修正してから再開する。実装を進めてから後で修正するのではなく、plan段階に戻る`,
      position: "after-steps",
    },
    {
      heading: "運用ルール",
      body: `### ステップ間の情報受け渡し
ステップ間の情報受け渡しは会話コンテキストではなくファイルを介して行う。
- 目的: 会話コンテキストの肥大化を防ぎ、後続ステップが必要な情報だけを選択的に読めるようにする
- 各ステップの出力を \`~/claude-code-data/workflows/{task-id}/\` 配下にファイルとして書き出す
- 次のステップは会話履歴ではなくファイルから前ステップの結果を読み込む
- ファイル名規約: \`{skill名}-result.md\`
- 結果テンプレートは各スキルの \`template-result.md\` に定義する`,
      position: "after-steps",
    },
  ],
});

export default devSkill;
