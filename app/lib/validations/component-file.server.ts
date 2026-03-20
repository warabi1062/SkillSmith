import type { PrismaClient } from "../../generated/prisma/client";
import { isSafeFilename } from "../path-validation.server";
import { ValidationError } from "./agent-team.server";

const VALID_ROLES = [
  "MAIN",
  "TEMPLATE",
  "REFERENCE",
  "EXAMPLE",
  "OUTPUT_SCHEMA",
] as const;

const FILENAME_MAX_LENGTH = 255;

/**
 * ComponentFile のフォーム入力バリデーション（同期）。
 * role が有効な enum 値であること、filename が空でなく255文字以内であることを検証する。
 * content は空文字列を許可する。
 */
export function validateComponentFileData(data: {
  role: string;
  filename: string;
  content: string;
}): void {
  if (!data.role || !VALID_ROLES.includes(data.role as (typeof VALID_ROLES)[number])) {
    throw new ValidationError({
      field: "role",
      code: "INVALID_ROLE",
      message: "Role must be one of: MAIN, TEMPLATE, REFERENCE, EXAMPLE, OUTPUT_SCHEMA",
    });
  }

  if (!data.filename || data.filename.trim().length === 0) {
    throw new ValidationError({
      field: "filename",
      code: "FILENAME_REQUIRED",
      message: "Filename is required",
    });
  }

  if (data.filename.trim().length > FILENAME_MAX_LENGTH) {
    throw new ValidationError({
      field: "filename",
      code: "FILENAME_TOO_LONG",
      message: `Filename must be ${FILENAME_MAX_LENGTH} characters or less`,
    });
  }

  if (!isSafeFilename(data.filename.trim())) {
    if (data.filename.includes("\0")) {
      throw new ValidationError({
        field: "filename",
        code: "FILENAME_NULL_BYTE",
        message: "Filename must not contain null bytes",
      });
    }
    if (data.filename.trim().startsWith("/")) {
      throw new ValidationError({
        field: "filename",
        code: "FILENAME_ABSOLUTE_PATH",
        message: "Filename must not be an absolute path",
      });
    }
    throw new ValidationError({
      field: "filename",
      code: "FILENAME_PATH_TRAVERSAL",
      message:
        'Filename must not contain path traversal sequences (e.g., "..")',
    });
  }
}

/**
 * MAIN ロールがコンポーネントごとに1つのみであることを検証する。
 * 作成時・更新時に呼び出す。
 */
export async function validateMainRoleUniqueness(
  prisma: PrismaClient,
  componentId: string,
  role: string,
  excludeFileId?: string,
): Promise<void> {
  if (role !== "MAIN") return;

  const existing = await prisma.componentFile.findFirst({
    where: {
      componentId,
      role: "MAIN",
      ...(excludeFileId ? { id: { not: excludeFileId } } : {}),
    },
  });

  if (existing) {
    throw new ValidationError({
      field: "role",
      code: "MAIN_ROLE_ALREADY_EXISTS",
      message: "A MAIN file already exists for this component. Only one MAIN file is allowed.",
    });
  }
}
