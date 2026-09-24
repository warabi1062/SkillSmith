import type { GeneratedFile, GenerationValidationError } from "./types";
import type { PluginAuthor } from "../types/plugin";
import { ERROR_CODES, FILE_PATHS } from "../types/constants";

// plugin.json に出力するフィールド（Claude Code の plugins 仕様に準拠）
interface PluginData {
  name: string;
  description?: string;
  version?: string;
  author?: PluginAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
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

  // 未指定のフィールドは出力しない（キー順序は公式ドキュメントの例に合わせる）
  const content: Record<string, unknown> = { name: plugin.name };
  if (plugin.version) content.version = plugin.version;
  if (plugin.description) content.description = plugin.description;
  if (plugin.author) content.author = plugin.author;
  if (plugin.homepage) content.homepage = plugin.homepage;
  if (plugin.repository) content.repository = plugin.repository;
  if (plugin.license) content.license = plugin.license;
  if (plugin.keywords && plugin.keywords.length > 0) {
    content.keywords = plugin.keywords;
  }

  return {
    file: {
      path: FILE_PATHS.PLUGIN_JSON,
      content: JSON.stringify(content, null, 2) + "\n",
    },
    errors,
  };
}
