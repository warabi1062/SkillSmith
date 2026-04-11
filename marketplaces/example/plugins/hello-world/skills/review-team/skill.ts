// WorkerWithAgentTeam のサンプル: チームでメッセージをレビューするスキル
import { WorkerWithAgentTeam, tool } from "../../../../../../app/lib/types";

const reviewTeamSkill = new WorkerWithAgentTeam({
  name: "review-team",
  description: "チームでメッセージの品質をレビューするスキル",
  allowedTools: [tool("Read"), tool("Write")],
  teamPrefix: "review",
  requiresUserApproval: true,
  additionalLeaderSteps: [
    "全レビュアーの結果を統合し、最終判定を出す",
    "修正が必要な場合はdrafterに差し戻す",
  ],
  teammates: [
    {
      name: "drafter",
      role: "メッセージの草稿を作成する",
      sortOrder: 1,
      steps: [
        {
          id: "1",
          title: "要件確認",
          body: "挨拶の対象・トーン・目的を確認する。",
        },
        {
          id: "2",
          title: "草稿作成",
          body: "要件に基づいてメッセージの草稿を作成する。",
        },
      ],
    },
    {
      name: "reviewer",
      role: "草稿の品質をチェックする",
      sortOrder: 2,
      steps: [
        {
          id: "1",
          title: "草稿レビュー",
          body: "トーン・文法・適切さの観点でレビューする。",
        },
        {
          id: "2",
          title: "フィードバック記録",
          body: "レビュー結果をワークフローファイルに記録する。",
        },
      ],
    },
  ],
});

export default reviewTeamSkill;
