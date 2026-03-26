// dev プラグイン内の共通 InlineStep 定義

import type { InlineStep } from "../../../app/lib/types";

// タスクID生成: ユーザー指示からslugベースのIDを生成する
export const generateTaskId: InlineStep = {
  inline: "タスクID生成",
  description: "指示内容から短いslugを生成し、タスクIDとする。",
  output: "タスクID: quick-{slug}\n例: quick-add-dark-mode",
};

// ブランチ作成: ベースブランチを判定しfeatureブランチを作成する
export const createBranch: InlineStep = {
  inline: "ブランチ作成",
  description: `対象が確定したら、実装を始める前にベースブランチを判定し、ブランチを作成して切り替える。（メインで実行）

ベースブランチの判定:
1. \`git branch -a\` で \`develop\` ブランチが存在するか確認する
2. 存在する場合 → \`develop\` をベースブランチとする（git flow）
3. 存在しない場合 → \`main\` または \`master\` をベースブランチとする（github flow）

- ベースブランチの最新を取得
- 新しいブランチを作成して切り替え
- 判定したベースブランチ名は \`~/claude-code-data/workflows/{ID}/base-branch.txt\` に保存し、そのパスを記録して後続のステップに渡す`,
  output:
    "ブランチ名: feature/{ID}-{タイトルのslug}\n例（Linear）: feature/LIN-123-add-user-authentication\n例（Quick）: feature/quick-add-dark-mode",
};
