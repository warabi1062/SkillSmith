import type { GeneratedFile, GenerationValidationError } from "./types";
import { serializeFrontmatter } from "./frontmatter.server";
import { generateAgentContent } from "./agent-content-generator";

// --- Agent Team MD生成 ---

interface AgentTeamComponentData {
  skillName: string;
  skillConfig: {
    name: string;
    description?: string;
    input?: string;
    output?: string;
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
      code: "NO_TEAM_MEMBERS",
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
      path: `agents/${agentName}.md`,
      content,
      skillName: component.skillName,
    },
    errors,
  };
}

// Agent設定データ
interface AgentConfigData {
  model?: string;
  tools?: string[];
  content: string;
  description?: string;
  sections?: { heading: string; body: string; position: "before-steps" | "after-steps" }[];
}

// スキル設定の情報
interface SkillConfigInfo {
  name: string;
  description?: string;
  input?: string;
  output?: string;
}

interface AgentComponentData {
  skillName: string;
  agentConfig: AgentConfigData;
  skillConfig: SkillConfigInfo;
}

export function generateAgentMd(component: AgentComponentData): {
  file: GeneratedFile | null;
  errors: GenerationValidationError[];
} {
  const errors: GenerationValidationError[] = [];
  const config = component.agentConfig;
  const skillConfig = component.skillConfig;

  // Agent名はskillConfig.nameから導出: "{name}-agent"
  const agentName = `${skillConfig.name}-agent`;

  // AgentConfig に description または sections がある場合は content を自動生成
  let agentContent = config.content;
  if (config.description || config.sections) {
    agentContent = generateAgentContent({
      skillName: skillConfig.name,
      description: config.description,
      input: skillConfig.input,
      output: skillConfig.output,
      sections: config.sections,
    });
  }

  // contentが空の場合はエラー
  if (!agentContent) {
    errors.push({
      severity: "error",
      code: "EMPTY_CONTENT",
      message: `Agent "${agentName}" has no content`,
      skillName: component.skillName,
    });
    return { file: null, errors };
  }

  // tools はすでに string[] で渡されるため、JSON パース不要
  const tools = config.tools;

  // Build frontmatter
  const frontmatterFields: Record<
    string,
    string | number | boolean | string[] | null | undefined
  > = {
    name: agentName,
    description: skillConfig.description ?? undefined,
  };

  if (config.model) {
    frontmatterFields.model = config.model;
  }
  if (tools && tools.length > 0) {
    frontmatterFields.tools = tools;
  }
  // skills: SkillConfigのnameを使用
  frontmatterFields.skills = [skillConfig.name];
  if (skillConfig.input) {
    frontmatterFields.input = skillConfig.input;
  }
  if (skillConfig.output) {
    frontmatterFields.output = skillConfig.output;
  }

  const frontmatter = serializeFrontmatter(frontmatterFields);
  const content = `${frontmatter}\n\n${agentContent}\n`;

  return {
    file: {
      path: `agents/${agentName}.md`,
      content,
      skillName: component.skillName,
    },
    errors,
  };
}
