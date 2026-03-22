import type { GeneratedFile, GenerationValidationError } from "./types";
import {
  serializeFrontmatter,
  parseJsonArrayField,
  checkHooksField,
} from "./frontmatter.server";

// --- Agent Team MD生成 ---

interface AgentTeamComponentData {
  id: string;
  skillConfig: {
    name: string;
    description: string | null;
    input: string;
    output: string;
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
      componentId: component.id,
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
      componentId: component.id,
    },
    errors,
  };
}

interface AgentConfigData {
  id: string;
  skillConfigId: string;
  model: string | null;
  tools: string | null;
  disallowedTools: string | null;
  permissionMode: string | null;
  hooks: string | null;
  memory: string | null;
  content: string;
}

interface SkillConfigInfo {
  name: string;
  description: string | null;
  input: string;
  output: string;
}

interface AgentComponentData {
  id: string;
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

  // contentが空の場合はエラー
  if (!config.content) {
    errors.push({
      severity: "error",
      code: "EMPTY_CONTENT",
      message: `Agent "${agentName}" has no content`,
      componentId: component.id,
    });
    return { file: null, errors };
  }

  // Check hooks
  const hooksError = checkHooksField(config.hooks, component.id);
  if (hooksError) {
    errors.push(hooksError);
  }

  // Parse JSON array fields
  const { parsed: tools, error: toolsError } = parseJsonArrayField(
    config.tools,
    "tools",
    component.id,
  );
  if (toolsError) {
    errors.push(toolsError);
  }

  const { parsed: disallowedTools, error: disallowedToolsError } =
    parseJsonArrayField(
      config.disallowedTools,
      "disallowedTools",
      component.id,
    );
  if (disallowedToolsError) {
    errors.push(disallowedToolsError);
  }

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
  if (tools) {
    frontmatterFields.tools = tools;
  }
  if (disallowedTools) {
    frontmatterFields.disallowedTools = disallowedTools;
  }
  // skills: SkillConfigのnameを使用
  frontmatterFields.skills = [skillConfig.name];
  if (config.permissionMode) {
    frontmatterFields.permissionMode = config.permissionMode;
  }
  if (config.memory) {
    frontmatterFields.memory = config.memory;
  }
  if (skillConfig.input) {
    frontmatterFields.input = skillConfig.input;
  }
  if (skillConfig.output) {
    frontmatterFields.output = skillConfig.output;
  }

  const frontmatter = serializeFrontmatter(frontmatterFields);
  const content = `${frontmatter}\n\n${config.content}\n`;

  return {
    file: {
      path: `agents/${agentName}.md`,
      content,
      componentId: component.id,
    },
    errors,
  };
}
