import type { PrismaClient } from "../../generated/prisma/client";
import { ValidationError } from "./agent-team.server";

/**
 * ComponentDependency 作成時のバリデーション。
 * - sourceId, targetId が空でないこと
 * - 自己参照でないこと
 * - source, target が存在すること
 * - 同一 pluginId に属すること
 * - Agent -> Skill 依存の場合、target の skillType が WORKER であること
 */
export async function validateDependencyCreate(
  prisma: PrismaClient,
  data: { sourceId: string; targetId: string },
): Promise<void> {
  if (!data.sourceId) {
    throw new ValidationError({
      field: "sourceId",
      code: "SOURCE_REQUIRED",
      message: "sourceId is required",
    });
  }

  if (!data.targetId) {
    throw new ValidationError({
      field: "targetId",
      code: "TARGET_REQUIRED",
      message: "targetId is required",
    });
  }

  if (data.sourceId === data.targetId) {
    throw new ValidationError({
      field: "targetId",
      code: "SELF_REFERENCE",
      message: "A component cannot depend on itself",
    });
  }

  const source = await prisma.component.findUnique({
    where: { id: data.sourceId },
    include: { skillConfig: true },
  });

  if (!source) {
    throw new ValidationError({
      field: "sourceId",
      code: "COMPONENT_NOT_FOUND",
      message: `Component with id "${data.sourceId}" not found`,
    });
  }

  const target = await prisma.component.findUnique({
    where: { id: data.targetId },
    include: { skillConfig: true },
  });

  if (!target) {
    throw new ValidationError({
      field: "targetId",
      code: "COMPONENT_NOT_FOUND",
      message: `Component with id "${data.targetId}" not found`,
    });
  }

  if (source.pluginId !== target.pluginId) {
    throw new ValidationError({
      field: "targetId",
      code: "CROSS_PLUGIN_DEPENDENCY",
      message: "Dependencies must be between components in the same plugin",
    });
  }

  // Agent -> Skill: target must be WORKER skill
  if (source.type === "AGENT" && target.type === "SKILL") {
    if (target.skillConfig?.skillType !== "WORKER") {
      throw new ValidationError({
        field: "targetId",
        code: "INVALID_SKILL_TYPE",
        message:
          "An agent can only depend on a WORKER skill, not an ENTRY_POINT skill",
      });
    }
  }
}
