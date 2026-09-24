import type { GeneratedFile, GenerationValidationError } from "./types";
import { serializeFrontmatter } from "../core/frontmatter.server";
import type { ToolRef, SkillModel, EffortLevel } from "../types/skill";
import { serializeToolRef } from "../types/skill";
import {
  SKILL_TYPES,
  ERROR_CODES,
  FILE_PATHS,
  FRONTMATTER_FIELDS,
  SKILL_DESCRIPTION_MAX_LENGTH,
} from "../types/constants";

const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SKILL_NAME_MAX_LENGTH = 64;

// スキル生成の入力データ
export interface SkillGeneratorInput {
  name: string;
  description?: string;
  skillType: string;
  argumentHint?: string;
  arguments?: string[];
  userInvocable?: boolean;
  disableModelInvocation?: boolean;
  model?: SkillModel;
  effort?: EffortLevel;
  allowedTools?: ToolRef[];
  disallowedTools?: ToolRef[];
  paths?: string[];
  whenToUse?: string;
  content: string;
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

  // description + when_to_use は合算で上限があり、超過分は Claude Code 側で切り詰められる
  const descriptionLength =
    (config.description?.length ?? 0) + (config.whenToUse?.length ?? 0);
  if (descriptionLength > SKILL_DESCRIPTION_MAX_LENGTH) {
    errors.push({
      severity: "warning",
      code: ERROR_CODES.SKILL_DESCRIPTION_TOO_LONG,
      message: `Skill "${config.name}" description + when_to_use is ${descriptionLength} characters, exceeding the ${SKILL_DESCRIPTION_MAX_LENGTH} character limit (the excess will be truncated by Claude Code)`,
      skillName: component.skillName,
      field: "description",
    });
  }

  // ToolRef[] → string[] にシリアライズしてfrontmatter用に変換
  const allowedTools = config.allowedTools?.map(serializeToolRef);
  const disallowedTools = config.disallowedTools?.map(serializeToolRef);

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
  if (config.whenToUse) {
    frontmatterFields[FRONTMATTER_FIELDS.WHEN_TO_USE] = config.whenToUse;
  }
  if (config.argumentHint) {
    frontmatterFields[FRONTMATTER_FIELDS.ARGUMENT_HINT] = config.argumentHint;
  }
  if (config.arguments && config.arguments.length > 0) {
    frontmatterFields[FRONTMATTER_FIELDS.ARGUMENTS] = config.arguments;
  }
  if (config.disableModelInvocation) {
    frontmatterFields[FRONTMATTER_FIELDS.DISABLE_MODEL_INVOCATION] = true;
  }
  if (config.model !== undefined) {
    frontmatterFields[FRONTMATTER_FIELDS.MODEL] = config.model;
  }
  if (config.effort !== undefined) {
    frontmatterFields[FRONTMATTER_FIELDS.EFFORT] = config.effort;
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
  if (disallowedTools && disallowedTools.length > 0) {
    frontmatterFields[FRONTMATTER_FIELDS.DISALLOWED_TOOLS] = disallowedTools;
  }
  if (config.paths && config.paths.length > 0) {
    frontmatterFields[FRONTMATTER_FIELDS.PATHS] = config.paths;
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
