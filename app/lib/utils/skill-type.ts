import { SKILL_TYPES } from "../types/constants";

// スキルタイプに対応するバッジ表示ラベルを返す
export function getSkillTypeBadge(skillType: string): string {
  switch (skillType) {
    case SKILL_TYPES.WORKER:
      return "WORKER";
    case SKILL_TYPES.WORKER_WITH_SUB_AGENT:
      return "WORKER + SUB AGENT";
    case SKILL_TYPES.WORKER_WITH_AGENT_TEAM:
      return "WORKER + AGENT TEAM";
    default:
      return skillType;
  }
}
