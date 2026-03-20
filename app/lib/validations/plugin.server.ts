import { ValidationError } from "./agent-team.server";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

export function validatePluginData(data: {
  name: string;
  description?: string;
}): void {
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError({
      field: "name",
      code: "NAME_REQUIRED",
      message: "Plugin name is required",
    });
  }

  if (data.name.trim().length > NAME_MAX_LENGTH) {
    throw new ValidationError({
      field: "name",
      code: "NAME_TOO_LONG",
      message: `Plugin name must be ${NAME_MAX_LENGTH} characters or less`,
    });
  }

  if (data.description && data.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    throw new ValidationError({
      field: "description",
      code: "DESCRIPTION_TOO_LONG",
      message: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`,
    });
  }
}
