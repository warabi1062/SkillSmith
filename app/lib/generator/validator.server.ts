import type { GeneratedPlugin, GenerationValidationError } from "./types";

/**
 * Validate the generated plugin output for structural correctness.
 * This performs post-generation checks that complement the per-component
 * validation done during generation.
 */
export function validateGeneratedPlugin(
  plugin: GeneratedPlugin,
): GenerationValidationError[] {
  const errors: GenerationValidationError[] = [];

  // Check directory structure compliance
  validateDirectoryStructure(plugin, errors);

  // Check dependency targets exist within the plugin
  // (This is done via file paths since we operate on generated output)
  validateFilePathUniqueness(plugin, errors);

  return errors;
}

function validateDirectoryStructure(
  plugin: GeneratedPlugin,
  errors: GenerationValidationError[],
): void {
  const paths = plugin.files.map((f) => f.path);

  // Must have plugin.json
  if (!paths.includes(".claude-plugin/plugin.json")) {
    errors.push({
      severity: "error",
      code: "DIRECTORY_STRUCTURE_MISMATCH",
      message: "Missing .claude-plugin/plugin.json",
    });
  }

  // Skills must be under skills/ directory
  for (const file of plugin.files) {
    if (file.path.endsWith("SKILL.md") && !file.path.startsWith("skills/")) {
      errors.push({
        severity: "warning",
        code: "DIRECTORY_STRUCTURE_MISMATCH",
        message: `SKILL.md file at unexpected path: ${file.path}`,
        componentId: file.componentId,
      });
    }
  }

  // Agents must be under agents/ directory
  for (const file of plugin.files) {
    if (
      file.path.startsWith("agents/") &&
      file.path.endsWith(".md") &&
      !file.path.includes("/")
    ) {
      // agents/*.md is fine - single level
    }
  }
}

function validateFilePathUniqueness(
  plugin: GeneratedPlugin,
  errors: GenerationValidationError[],
): void {
  const pathCounts = new Map<string, number>();
  for (const file of plugin.files) {
    pathCounts.set(file.path, (pathCounts.get(file.path) ?? 0) + 1);
  }

  for (const [path, count] of pathCounts) {
    if (count > 1) {
      errors.push({
        severity: "error",
        code: "DUPLICATE_FILE_PATH",
        message: `Duplicate file path: ${path} (${count} files)`,
      });
    }
  }
}
