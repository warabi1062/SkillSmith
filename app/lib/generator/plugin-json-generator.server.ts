import type { GeneratedFile, GenerationValidationError } from "./types";

interface PluginData {
  id: string;
  name: string;
  description: string | null;
}

export function generatePluginJson(plugin: PluginData): {
  file: GeneratedFile | null;
  errors: GenerationValidationError[];
} {
  const errors: GenerationValidationError[] = [];

  if (!plugin.name || plugin.name.trim() === "") {
    errors.push({
      severity: "error",
      code: "MISSING_PLUGIN_NAME",
      message: "Plugin name is required for plugin.json generation",
    });
    return { file: null, errors };
  }

  const content: Record<string, string> = {
    name: plugin.name,
  };
  if (plugin.description) {
    content.description = plugin.description;
  }

  return {
    file: {
      path: ".claude-plugin/plugin.json",
      content: JSON.stringify(content, null, 2) + "\n",
    },
    errors,
  };
}
