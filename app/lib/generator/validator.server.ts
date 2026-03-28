import type { GeneratedPlugin, GenerationValidationError } from "./types";

/**
 * バリデーション用のスキルデータ。
 */
export interface ValidatorSkillData {
  name: string;
  skillType: string;
  dependencies?: string[];
}

/**
 * Validate the generated plugin output for structural correctness.
 * This performs post-generation checks that complement the per-component
 * validation done during generation.
 */
export function validateGeneratedPlugin(
  plugin: GeneratedPlugin,
  skills?: ValidatorSkillData[],
): GenerationValidationError[] {
  const errors: GenerationValidationError[] = [];

  // Check for empty plugin (no skills or no generated content files)
  if (skills && skills.length === 0) {
    errors.push({
      severity: "error",
      code: "EMPTY_PLUGIN",
      message: "Plugin must have at least one component (skill or agent)",
    });
  } else {
    // Only check file-level emptiness when skill-level check didn't fire
    const contentFiles = plugin.files.filter(
      (f) => f.path !== ".claude-plugin/plugin.json",
    );
    if (contentFiles.length === 0) {
      errors.push({
        severity: "error",
        code: "EMPTY_PLUGIN",
        message: "Plugin must have at least one component (skill or agent)",
      });
    }
  }

  // Check directory structure compliance
  validateDirectoryStructure(plugin, errors);

  // Check file path uniqueness
  validateFilePathUniqueness(plugin, errors);

  // Check dependency targets (requires skill data with dependencies)
  if (skills) {
    validateDependencyTargets(skills, errors);
  }

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
        skillName: file.skillName,
      });
    }
  }

  // Agent files are always generated under agents/ by agent-generator,
  // so no directory validation is needed here.
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

/**
 * Validate that all dependency targets exist within the same plugin.
 * Reports a warning for each dependency whose target skill is not
 * found in the plugin's skill list.
 */
function validateDependencyTargets(
  skills: ValidatorSkillData[],
  errors: GenerationValidationError[],
): void {
  const skillNames = new Set(skills.map((s) => s.name));

  for (const skill of skills) {
    if (skill.dependencies) {
      for (const target of skill.dependencies) {
        if (!skillNames.has(target)) {
          errors.push({
            severity: "warning",
            code: "MISSING_DEPENDENCY_TARGET",
            message: `Skill "${skill.name}" depends on "${target}" which is not in the same plugin`,
            skillName: skill.name,
          });
        }
      }
    }
  }
}
