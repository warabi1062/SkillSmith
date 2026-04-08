import type { GeneratedFile, GenerationValidationError } from "./types";
import { serializeFrontmatter } from "../core/frontmatter.server";
import { generateAgentContent } from "./agent-content-generator.server";
import type { ToolRef, Section } from "../types/skill";
import { serializeToolRef } from "../types/skill";
import { ERROR_CODES, FILE_PATHS } from "../types/constants";

// Agent設定データ
interface AgentConfigData {
  model?: string;
  tools?: ToolRef[];
  description: string;
  beforeSections?: Section[];
  afterSections?: Section[];
}

// スキル設定の情報
interface SkillConfigInfo {
  name: string;
  description?: string;
  input?: string[];
  output?: string[];
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

  // description + beforeSections/afterSections から content を自動生成
  const agentContent = generateAgentContent({
    skillName: skillConfig.name,
    description: config.description,
    input: skillConfig.input,
    output: skillConfig.output,
    beforeSections: config.beforeSections?.map((s) => ({
      heading: s.heading,
      body: s.body,
    })),
    afterSections: config.afterSections?.map((s) => ({
      heading: s.heading,
      body: s.body,
    })),
  });

  // contentが空の場合はエラー
  if (!agentContent) {
    errors.push({
      severity: "error",
      code: ERROR_CODES.EMPTY_CONTENT,
      message: `Agent "${agentName}" has no content`,
      skillName: component.skillName,
    });
    return { file: null, errors };
  }

  // ToolRef[] → string[] にシリアライズしてfrontmatter用に変換
  const tools = config.tools?.map(serializeToolRef);

  // Build frontmatter
  const frontmatterFields: Record<
    string,
    string | number | boolean | string[] | null | undefined
  > = {
    name: agentName,
    description: config.description ?? skillConfig.description ?? undefined,
  };

  if (config.model) {
    frontmatterFields.model = config.model;
  }
  if (tools && tools.length > 0) {
    frontmatterFields.tools = tools;
  }
  // skills: SkillConfigのnameを使用
  frontmatterFields.skills = [skillConfig.name];

  const frontmatter = serializeFrontmatter(frontmatterFields);
  const content = `${frontmatter}\n\n${agentContent}\n`;

  return {
    file: {
      path: `${FILE_PATHS.AGENTS_DIR}${agentName}.md`,
      content,
      skillName: component.skillName,
    },
    errors,
  };
}
