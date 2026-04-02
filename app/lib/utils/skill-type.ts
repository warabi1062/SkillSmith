// スキルタイプに対応するバッジ表示ラベルを返す
export function getSkillTypeBadge(skillType: string): string {
  switch (skillType) {
    case "WORKER":
      return "WORKER";
    case "WORKER_WITH_SUB_AGENT":
      return "WORKER + SUB AGENT";
    case "WORKER_WITH_AGENT_TEAM":
      return "WORKER + AGENT TEAM";
    default:
      return skillType;
  }
}
