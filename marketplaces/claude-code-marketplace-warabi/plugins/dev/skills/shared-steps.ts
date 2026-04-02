// dev プラグイン内の共通 InlineStep 定義

import type { InlineStep } from "../../../../../app/lib/types";

// タスクID生成: ユーザー指示からslugベースのIDを生成する
export const generateTaskId: InlineStep = {
  inline: "タスクID生成",
  steps: [
    {
      id: "1",
      title: "slug生成",
      body: "指示内容から短いslugを生成し、タスクIDとする。",
    },
  ],
  output: ["タスクID: quick-{slug}（例: quick-add-dark-mode）"],
};

// ブランチ作成: ベースブランチを判定しfeatureブランチを作成する
export const createBranch: InlineStep = {
  inline: "ブランチ作成",
  steps: [
    {
      id: "1",
      title: "ベースブランチ判定",
      body: "`git branch -a` で `develop` ブランチが存在するか確認する。存在する場合 → `develop`（git flow）、存在しない場合 → `main` または `master`（github flow）をベースブランチとする。",
    },
    {
      id: "2",
      title: "最新取得・ブランチ作成",
      body: "ベースブランチの最新を取得し、新しいブランチを作成して切り替える。",
    },
    {
      id: "3",
      title: "ベースブランチ情報保存",
      body: "判定したベースブランチ名は `~/claude-code-data/workflows/{ID}/base-branch.txt` に保存し、そのファイルパスを記録して後続のステップに渡す。",
    },
  ],
  output: ["ブランチ名: feature/{ID}-{タイトルのslug}（例: feature/LIN-123-add-user-authentication）"],
};
