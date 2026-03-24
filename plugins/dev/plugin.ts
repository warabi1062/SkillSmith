// dev プラグイン定義

import type { PluginDefinition } from "../../app/lib/types";
import devSkill from "./skills/dev/skill";
import devLiteSkill from "./skills/dev-lite/skill";
import linearManageSkill from "./skills/linear-manage/skill";
import planTeamSkill from "./skills/plan-team/skill";
import implementTeamSkill from "./skills/implement-team/skill";
import createPrSkill from "./skills/create-pr/skill";
import linearTriageTeamSkill from "./skills/linear-triage-team/skill";
import linearTriageExecuteSkill from "./skills/linear-triage-execute/skill";
const plugin: PluginDefinition = {
  name: "dev",
  description:
    "Linearチケットまたはユーザー指示から実装計画・実装・PR作成まで自動で行う開発ワークフロー",
  skills: [
    devSkill,
    devLiteSkill,
    linearManageSkill,
    planTeamSkill,
    implementTeamSkill,
    createPrSkill,
    linearTriageTeamSkill,
    linearTriageExecuteSkill,
  ],
};

export default plugin;
