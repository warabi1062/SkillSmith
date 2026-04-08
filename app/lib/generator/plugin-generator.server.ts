import type {
  LoadedPluginDefinition,
  LoadedSkillUnion,
} from "../types/loaded";
import { SKILL_TYPES } from "../types/constants";
import type {
  GeneratedPlugin,
  GeneratedFile,
  GenerationValidationError,
} from "./types";
import type { ValidatorSkillData } from "./validator.server";
import { generatePluginJson } from "./plugin-json-generator.server";
import { generateSkillMd } from "./skill-generator.server";
import { generateAgentMd } from "./agent-generator.server";
import { generateSupportFiles } from "./file-generator.server";
import { resolveSkillContent } from "./content-resolver.server";
import { generateHooks } from "./hooks-generator.server";

export interface SkillComponentResult {
  files: GeneratedFile[];
  errors: GenerationValidationError[];
}

export interface GeneratePluginResult {
  plugin: GeneratedPlugin;
  skills: ValidatorSkillData[];
}

/**
 * スキル一覧からメタ情報マップを構築する。
 * オーケストレーターのスキル参照ステップで入出力を表示するために使う。
 */
export function buildSkillMetas(
  skills: LoadedSkillUnion[],
): Map<string, { input?: string[]; output?: string[]; hasAgent?: boolean }> {
  const skillMetas = new Map<
    string,
    { input?: string[]; output?: string[]; hasAgent?: boolean }
  >();
  for (const skill of skills) {
    if (skill.input || skill.output || skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT) {
      skillMetas.set(skill.name, {
        input: skill.input,
        output: skill.output,
        hasAgent: skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT,
      });
    }
  }
  return skillMetas;
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

  const skillMetas = buildSkillMetas(pluginDef.skills);

  // Generate skill files
  for (const skill of pluginDef.skills) {
    const result = generateSkillComponent(skill, skillMetas);
    files.push(...result.files);
    validationErrors.push(...result.errors);
  }

  // Generate hooks files
  if (pluginDef.hooks) {
    const hooksResult = generateHooks(pluginDef.hooks);
    files.push(...hooksResult.files);
    validationErrors.push(...hooksResult.errors);
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

export function generateSkillComponent(
  skill: LoadedSkillUnion,
  skillMetas: Map<string, { input?: string[]; output?: string[] }>,
): SkillComponentResult {
  const files: GeneratedFile[] = [];
  const errors: GenerationValidationError[] = [];
  const content = resolveSkillContent(skill, skillMetas);

  const result = generateSkillMd({
    skillName: skill.name,
    skillConfig: {
      name: skill.name,
      description: skill.description,
      skillType: skill.skillType,
      argumentHint: skill.argumentHint,
      userInvocable: skill.userInvocable,
      disableModelInvocation: skill.disableModelInvocation,
      allowedTools: skill.allowedTools,
      content,
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
  if (skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT) {
    const agentResult = generateAgentMd({
      skillName: skill.name,
      agentConfig: {
        model: skill.agentConfig.model,
        tools: skill.agentConfig.tools,
        description: skill.agentConfig.description,
        beforeSections: skill.agentConfig.beforeSections,
        afterSections: skill.agentConfig.afterSections,
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

  return { files, errors };
}
