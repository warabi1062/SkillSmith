import type { GeneratedFile, GenerationValidationError } from "./types";
import { generateAgentContent } from "./agent-content-generator.server";
import { buildAgentFileContent } from "./agent-file-builder.server";
import type {
  ToolRef,
  Section,
  ModelSpec,
  EffortLevel,
  AgentMemoryScope,
} from "../types/skill";
import { tool } from "../types/skill";
import {
  AGENT_NESTING_DISALLOWED_TOOL,
  ERROR_CODES,
  FILE_PATHS,
} from "../types/constants";

// Agent設定データ
interface AgentConfigData {
  model?: ModelSpec;
  effort?: EffortLevel;
  tools?: ToolRef[];
  disallowedTools?: ToolRef[];
  maxTurns?: number;
  memory?: AgentMemoryScope;
  isolation?: "worktree";
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

  const content = buildAgentFileContent({
    name: agentName,
    description: config.description ?? skillConfig.description ?? "",
    model: config.model,
    effort: config.effort,
    tools: config.tools,
    disallowedTools: withNestingDisallowed(config.disallowedTools),
    maxTurns: config.maxTurns,
    memory: config.memory,
    isolation: config.isolation,
    skills: [skillConfig.name],
    body: agentContent,
  });

  return {
    file: {
      path: `${FILE_PATHS.AGENTS_DIR}${agentName}.md`,
      content,
      skillName: component.skillName,
    },
    errors,
  };
}

// disallowedTools に Agent を追加する（既にあれば重複させない）
// Worker Agent から更に subagent を起動させないための設計方針を生成物で担保する
function withNestingDisallowed(disallowedTools?: ToolRef[]): ToolRef[] {
  const base = disallowedTools ?? [];
  const alreadyIncluded = base.some(
    (ref) =>
      ref.type === "tool" &&
      ref.name === AGENT_NESTING_DISALLOWED_TOOL &&
      !ref.pattern,
  );
  return alreadyIncluded
    ? base
    : [...base, tool(AGENT_NESTING_DISALLOWED_TOOL)];
}
