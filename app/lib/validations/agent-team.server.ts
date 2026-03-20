import type { PrismaClient } from "../../generated/prisma/client";

export class ValidationError extends Error {
  readonly field: string;
  readonly code: string;

  constructor({
    field,
    code,
    message,
  }: {
    field: string;
    code: string;
    message: string;
  }) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.code = code;
  }
}

/**
 * AgentTeam 作成時のバリデーション。
 * orchestratorId が指す Component が SKILL タイプかつ
 * SkillConfig.skillType が ENTRY_POINT であることを検証する。
 */
export async function validateAgentTeamCreate(
  prisma: PrismaClient,
  data: { orchestratorId: string }
): Promise<void> {
  const component = await prisma.component.findUnique({
    where: { id: data.orchestratorId },
    include: { skillConfig: true },
  });

  if (!component) {
    throw new ValidationError({
      field: "orchestratorId",
      code: "COMPONENT_NOT_FOUND",
      message: `Component with id "${data.orchestratorId}" not found`,
    });
  }

  if (component.type !== "SKILL") {
    throw new ValidationError({
      field: "orchestratorId",
      code: "INVALID_COMPONENT_TYPE",
      message: `orchestratorId must reference a SKILL component, but got "${component.type}"`,
    });
  }

  if (!component.skillConfig) {
    throw new ValidationError({
      field: "orchestratorId",
      code: "SKILL_CONFIG_NOT_FOUND",
      message: `Component "${data.orchestratorId}" does not have a SkillConfig`,
    });
  }

  if (component.skillConfig.skillType !== "ENTRY_POINT") {
    throw new ValidationError({
      field: "orchestratorId",
      code: "INVALID_SKILL_TYPE",
      message: `orchestratorId must reference an ENTRY_POINT skill, but got "${component.skillConfig.skillType}"`,
    });
  }
}

/**
 * AgentTeamMember 作成時のバリデーション。
 * componentId が指す Component が AGENT タイプであることを検証する。
 */
export async function validateAgentTeamMemberCreate(
  prisma: PrismaClient,
  data: { componentId: string }
): Promise<void> {
  const component = await prisma.component.findUnique({
    where: { id: data.componentId },
  });

  if (!component) {
    throw new ValidationError({
      field: "componentId",
      code: "COMPONENT_NOT_FOUND",
      message: `Component with id "${data.componentId}" not found`,
    });
  }

  if (component.type !== "AGENT") {
    throw new ValidationError({
      field: "componentId",
      code: "INVALID_COMPONENT_TYPE",
      message: `AgentTeamMember.componentId must reference an AGENT component, but got "${component.type}"`,
    });
  }
}
