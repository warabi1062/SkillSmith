import { prisma } from "../db.server";
import type {
  GeneratedPlugin,
  GeneratedFile,
  GenerationValidationError,
} from "./types";
import type { ValidatorComponentData } from "./validator.server";
import { generatePluginJson } from "./plugin-json-generator.server";
import { generateSkillMd } from "./skill-generator.server";
import { generateAgentMd } from "./agent-generator.server";
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
          skillConfig: true,
          agentConfig: true,
          files: { orderBy: { sortOrder: "asc" } },
          dependenciesFrom: {
            include: {
              target: {
                include: { skillConfig: true, agentConfig: true },
              },
            },
            orderBy: { order: "asc" },
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

  // Generate component files
  for (const component of plugin.components) {
    if (component.type === "SKILL" && component.skillConfig) {
      generateSkillComponent(component, files, validationErrors);
    } else if (component.type === "AGENT" && component.agentConfig) {
      generateAgentComponent(component, files, validationErrors);
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
    type: component.type as "SKILL" | "AGENT",
    skillConfig: component.skillConfig
      ? {
          name: component.skillConfig.name,
          skillType: component.skillConfig.skillType,
        }
      : null,
    agentConfig: component.agentConfig
      ? { name: component.agentConfig.name }
      : null,
    dependenciesFrom: component.dependenciesFrom.map((dep) => ({
      target: {
        id: dep.target.id,
        type: dep.target.type as "SKILL" | "AGENT",
        skillConfig: dep.target.skillConfig
          ? {
              name: dep.target.skillConfig.name,
              skillType: dep.target.skillConfig.skillType,
            }
          : null,
        agentConfig: dep.target.agentConfig
          ? { name: dep.target.agentConfig.name }
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
      agent: config.agent,
      model: config.model,
      hooks: config.hooks,
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
}

function generateAgentComponent(
  component: ComponentWithRelations,
  files: GeneratedFile[],
  errors: GenerationValidationError[],
): void {
  const config = component.agentConfig!;
  const result = generateAgentMd({
    id: component.id,
    agentConfig: {
      id: config.id,
      componentId: config.componentId,
      name: config.name,
      description: config.description,
      model: config.model,
      tools: config.tools,
      disallowedTools: config.disallowedTools,
      permissionMode: config.permissionMode,
      hooks: config.hooks,
      memory: config.memory,
      content: config.content,
      input: config.input,
      output: config.output,
    },
    dependenciesFrom: component.dependenciesFrom.map((dep) => ({
      target: {
        skillConfig: dep.target.skillConfig
          ? { name: dep.target.skillConfig.name }
          : null,
      },
      order: dep.order,
    })),
  });

  errors.push(...result.errors);
  if (result.file) {
    files.push(result.file);
  }

  // Agents don't have support files in their directory (single-file convention)
}
