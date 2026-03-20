import type { PrismaClient } from "../../generated/prisma/client";
import { ValidationError } from "./agent-team.server";

const VALID_FIELD_TYPES = ["TEXT", "ENUM", "LIST", "TABLE", "GROUP"] as const;
const NAME_MAX_LENGTH = 100;

/** Field type options for use in UI select elements. */
export const FIELD_TYPES = VALID_FIELD_TYPES.map((value) => ({
  value,
  label: value,
}));

/**
 * OutputSchemaField のバリデーション。
 * name必須・一意性、fieldType有効性、ENUM時のenumValues必須を検証する。
 */
export async function validateOutputSchemaFieldData(
  prisma: PrismaClient,
  data: {
    componentFileId: string;
    name: string;
    fieldType: string;
    required: boolean;
    enumValues?: string;
    excludeFieldId?: string;
  },
): Promise<void> {
  // name: required, non-empty
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError({
      field: "name",
      code: "NAME_REQUIRED",
      message: "Field name is required",
    });
  }

  if (data.name.trim().length > NAME_MAX_LENGTH) {
    throw new ValidationError({
      field: "name",
      code: "NAME_TOO_LONG",
      message: `Field name must be ${NAME_MAX_LENGTH} characters or less`,
    });
  }

  // name: uniqueness within componentFile
  const existingWithSameName = await prisma.outputSchemaField.findFirst({
    where: {
      componentFileId: data.componentFileId,
      name: data.name.trim(),
      ...(data.excludeFieldId ? { id: { not: data.excludeFieldId } } : {}),
    },
  });

  if (existingWithSameName) {
    throw new ValidationError({
      field: "name",
      code: "DUPLICATE_NAME",
      message: "A field with this name already exists in this file",
    });
  }

  // fieldType: valid enum value
  if (
    !data.fieldType ||
    !VALID_FIELD_TYPES.includes(
      data.fieldType as (typeof VALID_FIELD_TYPES)[number],
    )
  ) {
    throw new ValidationError({
      field: "fieldType",
      code: "INVALID_FIELD_TYPE",
      message: `Field type must be one of: ${VALID_FIELD_TYPES.join(", ")}`,
    });
  }

  // enumValues: required when fieldType is ENUM
  if (
    data.fieldType === "ENUM" &&
    (!data.enumValues || data.enumValues.trim().length === 0)
  ) {
    throw new ValidationError({
      field: "enumValues",
      code: "ENUM_VALUES_REQUIRED",
      message: "Enum values are required when field type is ENUM",
    });
  }
}
