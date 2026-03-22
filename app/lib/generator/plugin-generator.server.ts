import { prisma } from "../db.server";
import type {
  GeneratedPlugin,
  GeneratedFile,
  GenerationValidationError,
} from "./types";
import type { ValidatorComponentData } from "./validator.server";
import { generatePluginJson } from "./plugin-json-generator.server";
import { generateSkillMd } from "./skill-generator.server";
import { generateAgentMd, generateAgentTeamMd } from "./agent-generator.server";
import { generateSupportFiles } from "./file-generator.server";

/**
 * Fetch all plugin data needed for generation in a single query.
 */
async function fetchPluginData(pluginId: string) {
  return prisma.plugin.findUnique({
    where: { id: pluginId },
    include: {
      components: {
        include: {
          skillConfig: {
            include: { agentConfig: true },
          },
          files: { orderBy: { sortOrder: "asc" } },
          dependenciesFrom: {
            include: {
              target: {
                include: { skillConfig: true },
              },
            },
            orderBy: { order: "asc" },
          },
          agentTeamMembers: {
            include: {
              component: {
                include: { skillConfig: true },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
}

type PluginWithComponents = NonNullable<
  Awaited<ReturnType<typeof fetchPluginData>>
>;
type ComponentWithRelations = PluginWithComponents["components"][number];

export interface GeneratePluginResult {
  plugin: GeneratedPlugin;
  components: ValidatorComponentData[];
}

/**
 * Generate all files for a plugin.
 */
export async function generatePlugin(
  pluginId: string,
): Promise<GeneratePluginResult | null> {
  const plugin = await fetchPluginData(pluginId);
  if (!plugin) {
    return null;
  }

  const files: GeneratedFile[] = [];
  const validationErrors: GenerationValidationError[] = [];

  // Generate plugin.json
  const pluginJson = generatePluginJson(plugin);
  validationErrors.push(...pluginJson.errors);
  if (pluginJson.file) {
    files.push(pluginJson.file);
  }

  // Generate component files (SKILL only - AGENT型は廃止)
  for (const component of plugin.components) {
    if (component.type === "SKILL" && component.skillConfig) {
      generateSkillComponent(component, files, validationErrors);
    }
  }

  // Build component data for validator
  const validatorComponents: ValidatorComponentData[] =
    plugin.components.map(toValidatorComponentData);

  return {
    plugin: {
      pluginName: plugin.name,
      files,
      validationErrors,
    },
    components: validatorComponents,
  };
}

function toValidatorComponentData(
  component: ComponentWithRelations,
): ValidatorComponentData {
  return {
    id: component.id,
    type: "SKILL",
    skillConfig: component.skillConfig
      ? {
          name: component.skillConfig.name,
          skillType: component.skillConfig.skillType,
        }
      : null,
    dependenciesFrom: component.dependenciesFrom.map((dep) => ({
      target: {
        id: dep.target.id,
        type: "SKILL" as const,
        skillConfig: dep.target.skillConfig
          ? {
              name: dep.target.skillConfig.name,
              skillType: dep.target.skillConfig.skillType,
            }
          : null,
      },
    })),
  };
}

function generateSkillComponent(
  component: ComponentWithRelations,
  files: GeneratedFile[],
  errors: GenerationValidationError[],
): void {
  const config = component.skillConfig!;
  const result = generateSkillMd({
    id: component.id,
    skillConfig: {
      id: config.id,
      componentId: config.componentId,
      name: config.name,
      description: config.description,
      argumentHint: config.argumentHint,
      disableModelInvocation: config.disableModelInvocation,
      userInvocable: config.userInvocable,
      allowedTools: config.allowedTools,
      context: config.context,
      content: config.content,
      input: config.input,
      output: config.output,
    },
  });

  errors.push(...result.errors);
  if (result.file) {
    files.push(result.file);

    // Generate support files for skill directory
    const skillDir = `skills/${config.name}`;
    const supportFiles = generateSupportFiles(
      skillDir,
      component.files,
      component.id,
    );
    files.push(...supportFiles);
  }

  // WORKER_WITH_SUB_AGENT + agentConfig の場合はagent.mdも生成
  if (config.skillType === "WORKER_WITH_SUB_AGENT" && config.agentConfig) {
    const agentResult = generateAgentMd({
      id: component.id,
      agentConfig: {
        id: config.agentConfig.id,
        skillConfigId: config.agentConfig.skillConfigId,
        model: config.agentConfig.model,
        tools: config.agentConfig.tools,
        disallowedTools: config.agentConfig.disallowedTools,
        permissionMode: config.agentConfig.permissionMode,
        hooks: config.agentConfig.hooks,
        memory: config.agentConfig.memory,
        content: config.agentConfig.content,
      },
      skillConfig: {
        name: config.name,
        description: config.description,
        input: config.input,
        output: config.output,
      },
    });

    errors.push(...agentResult.errors);
    if (agentResult.file) {
      files.push(agentResult.file);
    }
  }

  // WORKER_WITH_AGENT_TEAM の場合はagent-team用のagent.mdを生成
  if (config.skillType === "WORKER_WITH_AGENT_TEAM") {
    const memberSkillNames = (component.agentTeamMembers ?? [])
      .map((m) => m.component.skillConfig?.name)
      .filter((name): name is string => name != null);

    const agentTeamResult = generateAgentTeamMd({
      id: component.id,
      skillConfig: {
        name: config.name,
        description: config.description,
        input: config.input,
        output: config.output,
      },
      memberSkillNames,
    });

    errors.push(...agentTeamResult.errors);
    if (agentTeamResult.file) {
      files.push(agentTeamResult.file);
    }
  }
}
