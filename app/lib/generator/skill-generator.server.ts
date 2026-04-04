import type { GeneratedFile, GenerationValidationError } from "./types";
import { serializeFrontmatter } from "./frontmatter.server";
import type { ToolRef } from "../types/skill";
import { serializeToolRef } from "../types/skill";
import { SKILL_TYPES, ERROR_CODES, FILE_PATHS, FRONTMATTER_FIELDS } from "../types/constants";

const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SKILL_NAME_MAX_LENGTH = 64;

// スキル生成の入力データ
export interface SkillGeneratorInput {
  name: string;
  description?: string;
  skillType: string;
  argumentHint?: string;
  userInvocable?: boolean;
  disableModelInvocation?: boolean;
  allowedTools?: ToolRef[];
  content: string;
  input?: string[];
  output?: string[];
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
      code: ERROR_CODES.INVALID_SKILL_NAME,
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
      code: ERROR_CODES.EMPTY_CONTENT,
      message: `Skill "${config.name}" has no content`,
      skillName: component.skillName,
    });
    return { file: null, errors };
  }

  // ToolRef[] → string[] にシリアライズしてfrontmatter用に変換
  const allowedTools = config.allowedTools?.map(serializeToolRef);

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
    frontmatterFields[FRONTMATTER_FIELDS.ARGUMENT_HINT] = config.argumentHint;
  }
  if (config.disableModelInvocation) {
    frontmatterFields[FRONTMATTER_FIELDS.DISABLE_MODEL_INVOCATION] = true;
  }
  // userInvocable が明示的に設定されていればその値を使う。未設定ならENTRY_POINT以外はfalse
  if (config.userInvocable !== undefined) {
    frontmatterFields[FRONTMATTER_FIELDS.USER_INVOCABLE] = config.userInvocable;
  } else if (config.skillType !== SKILL_TYPES.ENTRY_POINT) {
    frontmatterFields[FRONTMATTER_FIELDS.USER_INVOCABLE] = false;
  }
  if (allowedTools && allowedTools.length > 0) {
    frontmatterFields[FRONTMATTER_FIELDS.ALLOWED_TOOLS] = allowedTools;
  }

  const frontmatter = serializeFrontmatter(frontmatterFields);
  const content = `${frontmatter}\n\n${config.content}\n`;

  return {
    file: {
      path: `${FILE_PATHS.SKILLS_DIR}${config.name}/${FILE_PATHS.SKILL_MD}`,
      content,
      skillName: component.skillName,
    },
    errors,
  };
}
