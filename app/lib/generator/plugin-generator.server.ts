import type {
  LoadedPluginDefinition,
  LoadedSkillUnion,
  LoadedSupportFile,
} from "../types/loader.server";
import type {
  GeneratedPlugin,
  GeneratedFile,
  GenerationValidationError,
} from "./types";
import type { ValidatorSkillData } from "./validator.server";
import { generatePluginJson } from "./plugin-json-generator.server";
import { generateSkillMd } from "./skill-generator.server";
import { generateAgentMd, generateAgentTeamMd } from "./agent-generator.server";
import { generateSupportFiles } from "./file-generator.server";

export interface GeneratePluginResult {
  plugin: GeneratedPlugin;
  skills: ValidatorSkillData[];
}

/**
 * LoadedPluginDefinition からすべてのファイルを生成する（同期関数）。
 */
export function generatePlugin(
  pluginDef: LoadedPluginDefinition,
): GeneratePluginResult {
  const files: GeneratedFile[] = [];
  const validationErrors: GenerationValidationError[] = [];

  // Generate plugin.json
  const pluginJson = generatePluginJson({
    name: pluginDef.name,
    description: pluginDef.description,
  });
  validationErrors.push(...pluginJson.errors);
  if (pluginJson.file) {
    files.push(pluginJson.file);
  }

  // Generate skill files
  for (const skill of pluginDef.skills) {
    generateSkillComponent(skill, files, validationErrors);
  }

  // Build skill data for validator
  const validatorSkills: ValidatorSkillData[] = pluginDef.skills.map((s) => ({
    name: s.name,
    skillType: s.skillType,
    dependencies: s.dependencies,
  }));

  return {
    plugin: {
      pluginName: pluginDef.name,
      files,
      validationErrors,
    },
    skills: validatorSkills,
  };
}

function generateSkillComponent(
  skill: LoadedSkillUnion,
  files: GeneratedFile[],
  errors: GenerationValidationError[],
): void {
  const result = generateSkillMd({
    skillName: skill.name,
    skillConfig: {
      name: skill.name,
      description: skill.description,
      skillType: skill.skillType,
      argumentHint: skill.argumentHint,
      allowedTools: skill.allowedTools,
      content: skill.content,
      input: skill.input,
      output: skill.output,
    },
  });

  errors.push(...result.errors);
  if (result.file) {
    files.push(result.file);

    // Generate support files for skill directory
    const skillDir = `skills/${skill.name}`;
    const supportFiles = generateSupportFiles(
      skillDir,
      skill.files,
      skill.name,
    );
    files.push(...supportFiles);
  }

  // WORKER_WITH_SUB_AGENT の場合はagent.mdも生成
  if (skill.skillType === "WORKER_WITH_SUB_AGENT") {
    const agentResult = generateAgentMd({
      skillName: skill.name,
      agentConfig: {
        model: skill.agentConfig.model,
        tools: skill.agentConfig.tools,
        content: skill.agentConfig.content,
      },
      skillConfig: {
        name: skill.name,
        description: skill.description,
        input: skill.input,
        output: skill.output,
      },
    });

    errors.push(...agentResult.errors);
    if (agentResult.file) {
      files.push(agentResult.file);
    }
  }

  // WORKER_WITH_AGENT_TEAM の場合はagent-team用のagent.mdを生成
  if (skill.skillType === "WORKER_WITH_AGENT_TEAM") {
    const memberSkillNames = skill.agentTeamMembers.map((m) => m.skillName);

    const agentTeamResult = generateAgentTeamMd({
      skillName: skill.name,
      skillConfig: {
        name: skill.name,
        description: skill.description,
        input: skill.input,
        output: skill.output,
      },
      memberSkillNames,
    });

    errors.push(...agentTeamResult.errors);
    if (agentTeamResult.file) {
      files.push(agentTeamResult.file);
    }
  }
}
