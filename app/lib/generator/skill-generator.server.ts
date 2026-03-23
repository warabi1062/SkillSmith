import type { GeneratedFile, GenerationValidationError } from "./types";
import { serializeFrontmatter } from "./frontmatter.server";

const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SKILL_NAME_MAX_LENGTH = 64;

// スキル生成の入力データ
export interface SkillGeneratorInput {
  name: string;
  description?: string;
  skillType: string;
  argumentHint?: string;
  allowedTools?: string[];
  content: string;
  input?: string;
  output?: string;
}

interface SkillComponentData {
  skillName: string;
  skillConfig: SkillGeneratorInput;
}

export function generateSkillMd(component: SkillComponentData): {
  file: GeneratedFile | null;
  errors: GenerationValidationError[];
} {
  const errors: GenerationValidationError[] = [];
  const config = component.skillConfig;

  // Validate skill name
  if (
    !SKILL_NAME_PATTERN.test(config.name) ||
    config.name.length > SKILL_NAME_MAX_LENGTH
  ) {
    errors.push({
      severity: "error",
      code: "INVALID_SKILL_NAME",
      message: `Skill name "${config.name}" must match pattern [a-z0-9][a-z0-9-]* and be at most ${SKILL_NAME_MAX_LENGTH} characters`,
      skillName: component.skillName,
      field: "name",
    });
    return { file: null, errors };
  }

  // contentが空の場合はエラー
  if (!config.content) {
    errors.push({
      severity: "error",
      code: "EMPTY_CONTENT",
      message: `Skill "${config.name}" has no content`,
      skillName: component.skillName,
    });
    return { file: null, errors };
  }

  // allowedTools はすでに string[] で渡されるため、JSON パース不要
  const allowedTools = config.allowedTools;

  // Build frontmatter
  const frontmatterFields: Record<
    string,
    string | number | boolean | string[] | null | undefined
  > = {
    name: config.name,
  };

  if (config.description) {
    frontmatterFields.description = config.description;
  }
  if (config.argumentHint) {
    frontmatterFields["argument-hint"] = config.argumentHint;
  }
  // ENTRY_POINT以外のスキルはユーザーが直接呼び出さない
  if (config.skillType !== "ENTRY_POINT") {
    frontmatterFields["user-invocable"] = false;
  }
  if (allowedTools && allowedTools.length > 0) {
    frontmatterFields["allowed-tools"] = allowedTools;
  }
  if (config.input) {
    frontmatterFields.input = config.input;
  }
  if (config.output) {
    frontmatterFields.output = config.output;
  }

  const frontmatter = serializeFrontmatter(frontmatterFields);
  const content = `${frontmatter}\n\n${config.content}\n`;

  return {
    file: {
      path: `skills/${config.name}/SKILL.md`,
      content,
      skillName: component.skillName,
    },
    errors,
  };
}
