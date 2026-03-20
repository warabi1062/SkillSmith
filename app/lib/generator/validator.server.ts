import type { GeneratedPlugin, GenerationValidationError } from "./types";

/**
 * Component data needed for dependency validation.
 * This is a subset of the data fetched by plugin-generator.
 */
export interface ValidatorComponentData {
  id: string;
  type: "SKILL" | "AGENT";
  skillConfig: {
    name: string;
    skillType: string;
  } | null;
  agentConfig: {
    name: string;
  } | null;
  dependenciesFrom: {
    target: {
      id: string;
      type: "SKILL" | "AGENT";
      skillConfig: { name: string; skillType: string } | null;
      agentConfig: { name: string } | null;
    };
  }[];
}

/**
 * Validate the generated plugin output for structural correctness.
 * This performs post-generation checks that complement the per-component
 * validation done during generation.
 */
export function validateGeneratedPlugin(
  plugin: GeneratedPlugin,
  components?: ValidatorComponentData[],
): GenerationValidationError[] {
  const errors: GenerationValidationError[] = [];

  // Check directory structure compliance
  validateDirectoryStructure(plugin, errors);

  // Check file path uniqueness
  validateFilePathUniqueness(plugin, errors);

  // Check dependency targets and types (requires component data)
  if (components) {
    validateDependencyTargets(components, errors);
    validateSkillDependencyTypes(components, errors);
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
        componentId: file.componentId,
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
 * Reports a warning for each dependency whose target component is not
 * found in the plugin's component list.
 */
function validateDependencyTargets(
  components: ValidatorComponentData[],
  errors: GenerationValidationError[],
): void {
  const componentIds = new Set(components.map((c) => c.id));

  for (const component of components) {
    for (const dep of component.dependenciesFrom) {
      if (!componentIds.has(dep.target.id)) {
        const sourceName =
          component.skillConfig?.name ??
          component.agentConfig?.name ??
          component.id;
        const targetName =
          dep.target.skillConfig?.name ??
          dep.target.agentConfig?.name ??
          dep.target.id;
        errors.push({
          severity: "warning",
          code: "MISSING_DEPENDENCY_TARGET",
          message: `Component "${sourceName}" depends on "${targetName}" which is not in the same plugin`,
          componentId: component.id,
        });
      }
    }
  }
}

/**
 * Validate that agents only depend on skills with WORKER type.
 * Reports a warning when an agent depends on a skill that is not WORKER type.
 */
function validateSkillDependencyTypes(
  components: ValidatorComponentData[],
  errors: GenerationValidationError[],
): void {
  for (const component of components) {
    if (component.type !== "AGENT") {
      continue;
    }

    for (const dep of component.dependenciesFrom) {
      if (dep.target.type === "SKILL" && dep.target.skillConfig) {
        if (dep.target.skillConfig.skillType !== "WORKER") {
          const agentName = component.agentConfig?.name ?? component.id;
          const skillName = dep.target.skillConfig.name;
          errors.push({
            severity: "warning",
            code: "INVALID_SKILL_DEPENDENCY_TYPE",
            message: `Agent "${agentName}" depends on skill "${skillName}" which has type "${dep.target.skillConfig.skillType}" (expected "WORKER")`,
            componentId: component.id,
          });
        }
      }
    }
  }
}
