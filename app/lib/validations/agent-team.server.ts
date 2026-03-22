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
 * AgentTeamMember 作成時のバリデーション。
 * componentId が指す Component が WORKER_WITH_SUB_AGENT Skill であることを検証する。
 */
export async function validateAgentTeamMemberCreate(
  prisma: PrismaClient,
  data: { componentId: string }
): Promise<void> {
  const component = await prisma.component.findUnique({
    where: { id: data.componentId },
    include: { skillConfig: { include: { agentConfig: true } } },
  });

  if (!component) {
    throw new ValidationError({
      field: "componentId",
      code: "COMPONENT_NOT_FOUND",
      message: `Component with id "${data.componentId}" not found`,
    });
  }

  if (
    component.type !== "SKILL" ||
    component.skillConfig?.skillType !== "WORKER_WITH_SUB_AGENT"
  ) {
    throw new ValidationError({
      field: "componentId",
      code: "INVALID_COMPONENT_TYPE",
      message: `AgentTeamMember.componentId must reference a WORKER_WITH_SUB_AGENT skill`,
    });
  }
}
