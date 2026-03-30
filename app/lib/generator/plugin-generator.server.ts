import type {
  LoadedPluginDefinition,
  LoadedSkillUnion,
} from "../types/loader.server";
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
import { generateOrchestratorContent } from "./orchestrator-content-generator";
import { generateTeamContent } from "./team-content-generator";
import { generateWorkerContent } from "./worker-content-generator";

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

  // skillDescriptions マップを構築（Worker skill の description を参照するため）
  const skillDescriptions = new Map<string, string>();
  for (const skill of pluginDef.skills) {
    if (skill.description) {
      skillDescriptions.set(skill.name, skill.description);
    }
  }

  // Generate skill files
  for (const skill of pluginDef.skills) {
    generateSkillComponent(skill, files, validationErrors, skillDescriptions);
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
  skillDescriptions: Map<string, string>,
): void {
  // EntryPoint スキルの場合は steps + sections + メタデータから content を自動生成する
  let content = skill.content;
  if (skill.skillType === "ENTRY_POINT" && skill.steps) {
    content = generateOrchestratorContent({
      name: skill.name,
      description: skill.description,
      steps: skill.steps,
      sections: skill.sections,
      skillDescriptions,
    });
  }

  // WorkerWithSubAgent の場合は workerSteps + workerSections から content を自動生成する
  if (skill.skillType === "WORKER_WITH_SUB_AGENT" && skill.workerSteps) {
    content = generateWorkerContent({
      name: skill.name,
      description: skill.description,
      input: skill.input,
      output: skill.output,
      workerSteps: skill.workerSteps,
      workerSections: skill.workerSections,
    });
  }

  // WorkerWithAgentTeam の場合は teammates から content を自動生成する
  if (
    skill.skillType === "WORKER_WITH_AGENT_TEAM" &&
    skill.teammates &&
    skill.teamPrefix
  ) {
    content = generateTeamContent({
      name: skill.name,
      description: skill.description,
      input: skill.input,
      output: skill.output,
      teammates: skill.teammates,
      teamPrefix: skill.teamPrefix,
      requiresUserApproval: skill.requiresUserApproval,
    });
  }

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
  if (skill.skillType === "WORKER_WITH_SUB_AGENT") {
    const agentResult = generateAgentMd({
      skillName: skill.name,
      agentConfig: {
        model: skill.agentConfig.model,
        tools: skill.agentConfig.tools,
        content: skill.agentConfig.content,
        description: skill.agentConfig.description,
        sections: skill.agentConfig.sections,
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

}
