import { ValidationError } from "./agent-team.server";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const VALID_TYPES = ["SKILL", "AGENT"] as const;
const VALID_SKILL_TYPES = ["ENTRY_POINT", "WORKER"] as const;

export function validateComponentData(data: {
  type: string;
  name: string;
  description?: string;
  skillType?: string;
}): void {
  if (!VALID_TYPES.includes(data.type as (typeof VALID_TYPES)[number])) {
    throw new ValidationError({
      field: "type",
      code: "INVALID_TYPE",
      message: "Component type must be SKILL or AGENT",
    });
  }

  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError({
      field: "name",
      code: "NAME_REQUIRED",
      message: "Component name is required",
    });
  }

  if (data.name.trim().length > NAME_MAX_LENGTH) {
    throw new ValidationError({
      field: "name",
      code: "NAME_TOO_LONG",
      message: `Component name must be ${NAME_MAX_LENGTH} characters or less`,
    });
  }

  if (
    data.description &&
    data.description.trim().length > DESCRIPTION_MAX_LENGTH
  ) {
    throw new ValidationError({
      field: "description",
      code: "DESCRIPTION_TOO_LONG",
      message: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`,
    });
  }

  if (data.type === "SKILL") {
    if (!data.skillType || data.skillType.trim().length === 0) {
      throw new ValidationError({
        field: "skillType",
        code: "SKILL_TYPE_REQUIRED",
        message: "Skill type is required",
      });
    }

    if (
      !VALID_SKILL_TYPES.includes(
        data.skillType as (typeof VALID_SKILL_TYPES)[number],
      )
    ) {
      throw new ValidationError({
        field: "skillType",
        code: "INVALID_SKILL_TYPE",
        message: "Skill type must be ENTRY_POINT or WORKER",
      });
    }
  }

  if (data.type === "AGENT") {
    if (!data.description || data.description.trim().length === 0) {
      throw new ValidationError({
        field: "description",
        code: "DESCRIPTION_REQUIRED",
        message: "Description is required for Agent components",
      });
    }
  }
}
