// EntryPointSkill サンプル: Branch, ネストBranch, InlineStep, InlineStep input/output,
// beforeSections/afterSections, SupportFile全ロール
import { EntryPointSkill } from "../../../../../../app/lib/types";
import { SUPPORT_FILE_ROLES } from "../../../../../../app/lib/types/constants";
import analyzeDiffSkill from "../analyze-diff/skill";
import suggestFixSkill from "../suggest-fix/skill";
import fixTeamSkill from "../fix-team/skill";

const reviewPrSkill = new EntryPointSkill({
  name: "review-pr",
  description:
    "PRをレビューし、深刻度に応じた対応を行うオーケストレータースキル",
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
  // beforeSections: 作業詳細の前に配置
  beforeSections: [
    {
      heading: "レビュー基準",
      body: "コードの品質・セキュリティ・パフォーマンスの3軸でレビューを行う。\n\n詳細は [スタイルガイド](./style-guide.md) を参照し、[チェックリスト](./checklist.md) に沿ってレビューを実施すること。過去のレビュー例は [レビュー結果サンプル](./example-review.md) を参考にする。",
    },
  ],
  // afterSections: 補足説明として配置
  afterSections: [
    {
      heading: "エスカレーションポリシー",
      body: "- セキュリティ脆弱性が発見された場合、即座にセキュリティチームに報告する\n- パフォーマンス劣化が予測される変更は、ベンチマーク結果を添えてレビューを依頼する\n- 破壊的変更（breaking change）は、マイグレーションガイドの作成を必須とする",
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
