import type { LoadedPluginDefinition, LoadedSkillUnion } from "../types/loaded";
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
    if (
      skill.input ||
      skill.output ||
      skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT
    ) {
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
    version: pluginDef.version,
    author: pluginDef.author,
    homepage: pluginDef.homepage,
    repository: pluginDef.repository,
    license: pluginDef.license,
    keywords: pluginDef.keywords,
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
      arguments: skill.arguments,
      userInvocable: skill.userInvocable,
      disableModelInvocation: skill.disableModelInvocation,
      model: skill.model,
      effort: skill.effort,
      allowedTools: skill.allowedTools,
      disallowedTools: skill.disallowedTools,
      paths: skill.paths,
      whenToUse: skill.whenToUse,
      content,
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
        effort: skill.agentConfig.effort,
        tools: skill.agentConfig.tools,
        disallowedTools: skill.agentConfig.disallowedTools,
        maxTurns: skill.agentConfig.maxTurns,
        memory: skill.agentConfig.memory,
        isolation: skill.agentConfig.isolation,
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

  // WORKER_WITH_AGENT_TEAM は teammate の役割・制約・手順を SKILL.md 本文に直接展開するため、
  // 個別の agent.md ファイルは生成しない（リーダーは prompt にそれらを再掲する）
  return { files, errors };
}
