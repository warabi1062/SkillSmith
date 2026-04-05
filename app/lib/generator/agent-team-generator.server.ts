import type { GeneratedFile, GenerationValidationError } from "./types";
import { serializeFrontmatter } from "../core/frontmatter.server";
import { ERROR_CODES, FILE_PATHS } from "../types/constants";

// --- Agent Team MD生成 ---

interface AgentTeamComponentData {
  skillName: string;
  skillConfig: {
    name: string;
    description?: string;
    input?: string[];
    output?: string[];
  };
  memberSkillNames: string[];
}

/**
 * WORKER_WITH_AGENT_TEAM用のagent.mdを生成する。
 * skills:にメンバーのskill名を列挙する。
 */
export function generateAgentTeamMd(component: AgentTeamComponentData): {
  file: GeneratedFile | null;
  errors: GenerationValidationError[];
} {
  const errors: GenerationValidationError[] = [];
  const skillConfig = component.skillConfig;
  const agentName = `${skillConfig.name}-agent`;

  if (component.memberSkillNames.length === 0) {
    errors.push({
      severity: "warning",
      code: ERROR_CODES.NO_TEAM_MEMBERS,
      message: `Agent Team "${skillConfig.name}" has no members`,
      skillName: component.skillName,
    });
  }

  // Build frontmatter
  const frontmatterFields: Record<
    string,
    string | number | boolean | string[] | null | undefined
  > = {
    name: agentName,
    description: skillConfig.description ?? undefined,
  };

  // skills: メンバーのskill名を列挙
  if (component.memberSkillNames.length > 0) {
    frontmatterFields.skills = component.memberSkillNames;
  }

  if (skillConfig.input) {
    frontmatterFields.input = skillConfig.input;
  }
  if (skillConfig.output) {
    frontmatterFields.output = skillConfig.output;
  }

  const frontmatter = serializeFrontmatter(frontmatterFields);
  // Agent Team agentのcontentは空（frontmatterのみ）
  const content = `${frontmatter}\n`;

  return {
    file: {
      path: `${FILE_PATHS.AGENTS_DIR}${agentName}.md`,
      content,
      skillName: component.skillName,
    },
    errors,
  };
}
