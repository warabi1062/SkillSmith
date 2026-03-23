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
};

export default plugin;
