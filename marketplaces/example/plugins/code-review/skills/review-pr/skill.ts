// EntryPointSkill サンプル: Branch, ネストBranch, InlineStep, InlineStep input/output,
// セクション全位置, SupportFile全ロール, bodyFile
import { EntryPointSkill } from "../../../../../../app/lib/types";
import { SUPPORT_FILE_ROLES } from "../../../../../../app/lib/types/constants";
import analyzeDiffSkill from "../analyze-diff/skill";
import suggestFixSkill from "../suggest-fix/skill";
import fixTeamSkill from "../fix-team/skill";

const reviewPrSkill = new EntryPointSkill({
  name: "review-pr",
  displayName: "Review PR",
  description: "PRをレビューし、深刻度に応じた対応を行うオーケストレータースキル",
  userInvocable: true,
  argumentHint: "<pr-number>",
  input: ["PR番号"],
  output: ["レビュー結果サマリー"],
  // [8] SupportFile（TEMPLATE / REFERENCE / EXAMPLE）
  files: [
    {
      role: SUPPORT_FILE_ROLES.TEMPLATE,
      filename: "checklist.md",
      sortOrder: 1,
    },
    {
      role: SUPPORT_FILE_ROLES.REFERENCE,
      filename: "style-guide.md",
      sortOrder: 2,
    },
    {
      role: SUPPORT_FILE_ROLES.EXAMPLE,
      filename: "example-review.md",
      sortOrder: 3,
    },
  ],
  // [5] セクション位置バリエーション: before-steps, after-steps(bodyFile), before-step:N, after-step:N
  sections: [
    {
      heading: "レビュー基準",
      body: "コードの品質・セキュリティ・パフォーマンスの3軸でレビューを行う。",
      position: "before-steps",
    },
    {
      heading: "分析後の補足",
      body: "差分分析の結果を踏まえ、以下の分岐判定に進む。",
      position: "after-step:0",
    },
    {
      heading: "分岐前の確認事項",
      body: "深刻度判定が正しいことを確認してから分岐に進むこと。",
      position: "before-step:1",
    },
    {
      heading: "エスカレーションポリシー",
      // [9] bodyFile による外部ファイル読み込み（セクション）
      bodyFile: "escalation-policy.md",
      position: "after-steps",
    },
  ],
  steps: [
    // Step 1: スキル参照
    analyzeDiffSkill,
    // Step 2: [1] Branch（条件分岐）
    {
      decisionPoint: "レビュー深刻度の判定",
      description:
        "差分分析の結果に基づいて、変更の深刻度に応じた対応フローを選択する。",
      cases: {
        // [2] ネストされたBranch
        critical: [
          {
            decisionPoint: "セキュリティ影響の判定",
            cases: {
              yes: [fixTeamSkill],
              no: [suggestFixSkill],
            },
          },
        ],
        normal: [suggestFixSkill],
        // [3] InlineStep
        trivial: [
          {
            inline: "自動承認",
            steps: [
              {
                id: "1",
                title: "承認コメント投稿",
                body: "PRに承認コメントを投稿し、マージ可能状態にする。",
              },
            ],
          },
        ],
      },
    },
    // Step 3: [4] InlineStep の input/output
    {
      inline: "レビューサマリー作成",
      input: ["全レビュー結果"],
      output: ["最終レビューサマリー"],
      steps: [
        {
          id: "1",
          title: "結果統合",
          body: "各ステップのレビュー結果を統合する。",
        },
        {
          id: "2",
          title: "サマリー出力",
          body: "統合結果をマークダウン形式のサマリーとして出力する。",
        },
      ],
    },
  ],
});

export default reviewPrSkill;
