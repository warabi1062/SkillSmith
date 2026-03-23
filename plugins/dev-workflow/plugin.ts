// dev-workflow プラグイン定義

import type { PluginDefinition } from "../../app/lib/types";
import devSkill from "./skills/dev/skill";
import devLiteSkill from "./skills/dev-lite/skill";
import devMentorSkill from "./skills/dev-mentor/skill";
import linearManageSkill from "./skills/linear-manage/skill";
import planImplementationSkill from "./skills/plan-implementation/skill";
import implementSkill from "./skills/implement/skill";
import createPrSkill from "./skills/create-pr/skill";
import guideImplementationSkill from "./skills/guide-implementation/skill";
import mentorSessionSkill from "./skills/mentor-session/skill";
import linearTriageSkill from "./skills/linear-triage/skill";
import linearTriageReviewSkill from "./skills/linear-triage-review/skill";
import linearTriageExecuteSkill from "./skills/linear-triage-execute/skill";
import triageGithubPrCommentsSkill from "./skills/triage-github-pr-comments/skill";
import sentryInvestigateSkill from "./skills/sentry-investigate/skill";

const plugin: PluginDefinition = {
  name: "dev-workflow",
  description:
    "Linearチケット駆動の開発ワークフロー。チケット整理・実装計画・コード実装・レビュー・PR作成を自動化する。",
  skills: [
    devSkill,
    devLiteSkill,
    devMentorSkill,
    linearManageSkill,
    planImplementationSkill,
    implementSkill,
    createPrSkill,
    guideImplementationSkill,
    mentorSessionSkill,
    linearTriageSkill,
    linearTriageReviewSkill,
    linearTriageExecuteSkill,
    triageGithubPrCommentsSkill,
    sentryInvestigateSkill,
  ],
  dependencies: [
    // dev が呼び出す worker スキル（Linearモード）
    { source: "dev", target: "linear-triage", order: 1 },
    { source: "dev", target: "linear-triage-review", order: 2 },
    { source: "dev", target: "linear-triage-execute", order: 3 },
    // dev が呼び出す worker スキル（Sentryモード）
    { source: "dev", target: "sentry-investigate", order: 1 },
    // dev が呼び出す worker スキル（共通ステップ）
    { source: "dev", target: "plan-implementation", order: 4 },
    { source: "dev", target: "implement", order: 5 },
    { source: "dev", target: "create-pr", order: 6 },

    // dev-lite が呼び出す worker スキル
    { source: "dev-lite", target: "implement", order: 1 },
    { source: "dev-lite", target: "create-pr", order: 2 },

    // dev-mentor が呼び出す worker スキル（Linearモード）
    { source: "dev-mentor", target: "linear-triage", order: 1 },
    { source: "dev-mentor", target: "linear-triage-review", order: 2 },
    { source: "dev-mentor", target: "linear-triage-execute", order: 3 },
    // dev-mentor が呼び出す worker スキル（共通ステップ）
    { source: "dev-mentor", target: "plan-implementation", order: 4 },
    { source: "dev-mentor", target: "guide-implementation", order: 5 },
    { source: "dev-mentor", target: "mentor-session", order: 6 },
    { source: "dev-mentor", target: "create-pr", order: 7 },

    // linear-manage が呼び出す worker スキル
    { source: "linear-manage", target: "linear-triage", order: 1 },
    { source: "linear-manage", target: "linear-triage-review", order: 2 },
    { source: "linear-manage", target: "linear-triage-execute", order: 3 },
  ],
};

export default plugin;
