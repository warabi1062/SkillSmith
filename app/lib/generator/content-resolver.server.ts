// スキル種別に応じた content 生成分岐を一元化するリゾルバ

import type { LoadedSkillUnion } from "../types/loaded";
import { SKILL_TYPES } from "../types/constants";
import { generateOrchestratorContent } from "./orchestrator-content-generator.server";
import type { SkillMeta } from "./orchestrator-content-generator.server";
import { generateWorkerContent } from "./worker-content-generator.server";
import { generateTeamContent } from "./team-content-generator.server";

/**
 * スキル種別に応じて content を自動生成する。
 * 構造化定義（steps, workerSteps, teammates）から生成する。
 */
export function resolveSkillContent(
  skill: LoadedSkillUnion,
  skillMetas?: Map<string, SkillMeta>,
): string {
  if (skill.skillType === SKILL_TYPES.ENTRY_POINT && skill.steps) {
    return generateOrchestratorContent({
      steps: skill.steps,
      beforeSections: skill.beforeSections,
      afterSections: skill.afterSections,
      skillMetas,
    });
  }

  if (skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT) {
    return generateWorkerContent({
      input: skill.input,
      output: skill.output,
      workerSteps: skill.workerSteps,
      beforeSections: skill.beforeSections,
      afterSections: skill.afterSections,
    });
  }

  if (skill.skillType === SKILL_TYPES.WORKER && skill.workerSteps) {
    return generateWorkerContent({
      input: skill.input,
      output: skill.output,
      workerSteps: skill.workerSteps,
      beforeSections: skill.beforeSections,
      afterSections: skill.afterSections,
    });
  }

  if (
    skill.skillType === SKILL_TYPES.WORKER_WITH_AGENT_TEAM &&
    skill.teammates &&
    skill.teamPrefix
  ) {
    return generateTeamContent({
      input: skill.input,
      output: skill.output,
      teammates: skill.teammates,
      teamPrefix: skill.teamPrefix,
      additionalLeaderSteps: skill.additionalLeaderSteps,
      requiresUserApproval: skill.requiresUserApproval,
    });
  }

  return "";
}
