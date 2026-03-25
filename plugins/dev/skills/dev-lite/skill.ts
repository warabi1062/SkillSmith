// dev-lite スキル: 軽量版devワークフロー

import { EntryPointSkill } from "../../../../app/lib/types";
import implementTeamSkill from "../implement-team/skill";
import createPrSkill from "../create-pr/skill";

const devLiteSkill = new EntryPointSkill({
  name: "dev-lite",
  description:
    "ユーザー指示から実装・レビュー・draft PR作成を簡易ステップで行う軽量版dev",
  argumentHint: "[説明]",
  allowedTools: [
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "Bash",
    "Task",
    "AskUserQuestion",
    "ToolSearch",
  ],
  steps: [
    {
      inline: "タスクID生成",
      description: "指示内容から短い slug を生成し、タスクIDとする。",
      output: "タスクID: quick-{slug}\n例: quick-add-dark-mode",
    },
    {
      inline: "ブランチ作成",
      description: `ベースブランチを判定し、その最新を取得してから新しいブランチを作成して切り替える。（メインで実行）

ベースブランチの判定:
1. \`git branch -a\` で \`develop\` ブランチが存在するか確認する
2. 存在する場合 → \`develop\` をベースブランチとする（git flow）
3. 存在しない場合 → \`main\` または \`master\` をベースブランチとする（github flow）

判定したベースブランチ名は \`~/claude-code-data/workflows/{タスクID}/base-branch.txt\` に保存し、そのパスを記録して後続のステップに渡す。`,
      output: "ブランチ名: feature/{タスクID}\n例: feature/quick-add-dark-mode",
    },
    {
      inline: "簡易Plan生成",
      description: `plan-agent を使わず、オーケストレーター自身が簡易的な plan.md を生成する。（メインスレッドで実行）

1. ユーザーの指示内容を分析する
2. 必要に応じてコードベースを簡単に確認する（Grep/Glob で関連ファイルを特定）
3. 以下のフォーマットで \`~/claude-code-data/workflows/{タスクID}/plan.md\` に書き出す:

\`\`\`markdown
# 実装計画: {タスクID}

## ゴール
{ユーザーの指示を1-2文で}

## 変更ファイル一覧
| ファイルパス | 変更内容 | 新規/修正 |
|------------|---------|----------|

## コミット計画
| # | コミット内容 | 対象ファイル | 依存 |
|---|------------|------------|------|

## テスト計画
| テストファイル | テスト内容 | 種別 |
|-------------|---------|------|

## 既存パターンへの準拠
- {プロジェクトで使われている規則があれば記載}
\`\`\`

実装計画の保存先パスを記録し、後続のステップに渡す。

注意:
- コードベースの深い調査は不要。指示内容と簡単なファイル確認で十分
- 完璧な計画ではなく、implementer が作業の方向性を掴める程度でよい
- plan review やユーザー承認は行わない`,
    },
    implementTeamSkill,
    createPrSkill,
  ],
  sections: [
    {
      heading: "確認のスキップ",
      body: "最終的にユーザーは PR でレビューするため、中間の確認はすべて省略してそのまま次のステップに進む。",
      position: "after-steps",
    },
    {
      heading: "注意事項",
      body: `- 各ステップで問題が発生した場合はユーザーに報告して判断を仰ぐ
- Linear チケットは作成・更新しない（Quick mode）
- ユーザーからアプローチの変更提案があった場合は、即座に作業を中断し、plan.md を修正してから再開する`,
      position: "after-steps",
    },
    {
      heading: "運用ルール",
      body: `### ステップ間の情報受け渡し

ステップ間の情報受け渡しは会話コンテキストではなくファイルを介して行う。
- 各ステップの出力を \`~/claude-code-data/workflows/{タスクID}/\` 配下にファイルとして書き出す
- 次のステップは会話履歴ではなくファイルから前ステップの結果を読み込む`,
      position: "after-steps",
    },
  ],
});

export default devLiteSkill;
