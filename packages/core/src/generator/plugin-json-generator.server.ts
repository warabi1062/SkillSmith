import type { GeneratedFile, GenerationValidationError } from "./types";
import { ERROR_CODES, FILE_PATHS } from "../types/constants";

interface PluginData {
  name: string;
  description?: string;
}

export function generatePluginJson(plugin: PluginData): {
  file: GeneratedFile | null;
  errors: GenerationValidationError[];
} {
  const errors: GenerationValidationError[] = [];

  if (!plugin.name || plugin.name.trim() === "") {
    errors.push({
      severity: "error",
      code: ERROR_CODES.MISSING_PLUGIN_NAME,
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
      path: FILE_PATHS.PLUGIN_JSON,
      content: JSON.stringify(content, null, 2) + "\n",
    },
    errors,
  };
}
