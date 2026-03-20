import type { GeneratedFile, GenerationValidationError } from "./types";
import {
  serializeFrontmatter,
  parseJsonArrayField,
  checkHooksField,
} from "./frontmatter.server";

interface AgentConfigData {
  id: string;
  componentId: string;
  name: string;
  description: string;
  model: string | null;
  tools: string | null;
  disallowedTools: string | null;
  permissionMode: string | null;
  hooks: string | null;
  memory: string | null;
}

interface ComponentFileData {
  role: string;
  content: string;
}

interface DependencyTarget {
  skillConfig: { name: string } | null;
}

interface DependencyData {
  target: DependencyTarget;
  order: number;
}

interface AgentComponentData {
  id: string;
  agentConfig: AgentConfigData;
  files: ComponentFileData[];
  dependenciesFrom: DependencyData[];
}

export function generateAgentMd(component: AgentComponentData): {
  file: GeneratedFile | null;
  errors: GenerationValidationError[];
} {
  const errors: GenerationValidationError[] = [];
  const config = component.agentConfig;

  // Validate agent name convention
  if (!config.name.endsWith("-agent")) {
    errors.push({
      severity: "warning",
      code: "AGENT_NAME_CONVENTION",
      message: `Agent name "${config.name}" does not end with "-agent"`,
      componentId: component.id,
      field: "name",
    });
  }

  // Find MAIN file
  const mainFile = component.files.find((f) => f.role === "MAIN");
  if (!mainFile) {
    errors.push({
      severity: "error",
      code: "MISSING_MAIN_FILE",
      message: `Agent "${config.name}" has no MAIN file`,
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

  // Derive skills from dependencies (Agent -> Skill)
  const skillNames = component.dependenciesFrom
    .sort((a, b) => a.order - b.order)
    .filter((dep) => dep.target.skillConfig != null)
    .map((dep) => dep.target.skillConfig!.name);

  // Build frontmatter
  const frontmatterFields: Record<
    string,
    string | number | boolean | string[] | null | undefined
  > = {
    name: config.name,
    description: config.description,
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
  if (skillNames.length > 0) {
    frontmatterFields.skills = skillNames;
  }
  if (config.permissionMode) {
    frontmatterFields.permissionMode = config.permissionMode;
  }
  if (config.memory) {
    frontmatterFields.memory = config.memory;
  }

  const frontmatter = serializeFrontmatter(frontmatterFields);
  const content = `${frontmatter}\n\n${mainFile.content}\n`;

  return {
    file: {
      path: `agents/${config.name}.md`,
      content,
      componentId: component.id,
    },
    errors,
  };
}
