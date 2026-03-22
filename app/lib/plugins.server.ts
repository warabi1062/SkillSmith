import { Prisma } from "../generated/prisma/client";
import { logAuditEvent } from "./audit-log.server";
import { prisma } from "./db.server";
import {
  validateAgentTeamMemberCreate,
  validateComponentFileData,
  validateDependencyCreate,
  ValidationError,
} from "./validations";

export async function getPlugins() {
  return prisma.plugin.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { components: true },
      },
    },
  });
}

export async function getPlugin(id: string) {
  return prisma.plugin.findUnique({
    where: { id },
    include: {
      components: {
        include: {
          skillConfig: {
            include: { agentConfig: true },
          },
          dependenciesFrom: {
            select: { id: true, targetId: true, order: true },
          },
          files: {
            orderBy: { sortOrder: "asc" },
          },
          agentTeamMembers: {
            include: {
              component: {
                include: {
                  skillConfig: { select: { name: true } },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createPlugin(data: {
  name: string;
  description?: string;
}) {
  return prisma.plugin.create({
    data: {
      name: data.name,
      description: data.description || null,
    },
  });
}

export async function updatePlugin(
  id: string,
  data: { name: string; description?: string },
) {
  return prisma.plugin.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
    },
  });
}

export async function deletePlugin(id: string) {
  const plugin = await prisma.plugin.findUnique({
    where: { id },
    select: { name: true },
  });

  const deleted = await prisma.plugin.delete({
    where: { id },
  });

  logAuditEvent({
    action: "DELETE",
    entityType: "Plugin",
    entityId: id,
    entityName: plugin?.name,
    timestamp: new Date(),
  });

  return deleted;
}

// Component CRUD

export async function getComponent(id: string) {
  return prisma.component.findUnique({
    where: { id },
    include: {
      skillConfig: {
        include: { agentConfig: true },
      },
      files: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createComponent(
  pluginId: string,
  data: {
    type: "SKILL";
    name: string;
    description?: string | null;
    skillType?: "ENTRY_POINT" | "WORKER" | "WORKER_WITH_SUB_AGENT" | "WORKER_WITH_AGENT_TEAM";
  },
) {
  return prisma.component.create({
    data: {
      pluginId,
      type: data.type,
      skillConfig: {
        create: {
          name: data.name.trim(),
          skillType: data.skillType!,
          description: data.description?.trim() || null,
          // WORKER_WITH_SUB_AGENT作成時にagentConfigをデフォルトで同時作成
          ...(data.skillType === "WORKER_WITH_SUB_AGENT"
            ? {
                agentConfig: {
                  create: {},
                },
              }
            : {}),
        },
      },
    },
    include: {
      skillConfig: {
        include: { agentConfig: true },
      },
    },
  });
}

export async function updateComponent(
  id: string,
  data: {
    type: "SKILL";
    name: string;
    description?: string | null;
    skillType?: "ENTRY_POINT" | "WORKER" | "WORKER_WITH_SUB_AGENT" | "WORKER_WITH_AGENT_TEAM";
    content?: string;
    input?: string;
    output?: string;
    allowedTools?: string;
    argumentHint?: string;
    disableModelInvocation?: boolean;
    agentConfig?: {
      model?: string;
      tools?: string;
      content?: string;
    };
  },
) {
  // skillType変更時のagentConfig自動管理
  if (data.skillType) {
    const existing = await prisma.component.findUnique({
      where: { id },
      include: { skillConfig: { include: { agentConfig: true } } },
    });

    if (existing?.skillConfig) {
      const oldSkillType = existing.skillConfig.skillType;
      const newSkillType = data.skillType;

      // WORKER_WITH_SUB_AGENTに変更 & agentConfigが未作成の場合 -> 自動作成
      if (newSkillType === "WORKER_WITH_SUB_AGENT" && !existing.skillConfig.agentConfig) {
        await prisma.agentConfig.create({
          data: { skillConfigId: existing.skillConfig.id },
        });
      }

      // WORKER_WITH_SUB_AGENT以外に変更 & agentConfigが存在する場合 -> 自動削除
      if (
        oldSkillType === "WORKER_WITH_SUB_AGENT" &&
        newSkillType !== "WORKER_WITH_SUB_AGENT" &&
        existing.skillConfig.agentConfig
      ) {
        await prisma.agentConfig.delete({
          where: { id: existing.skillConfig.agentConfig.id },
        });
        // agentConfigフィールドの更新をスキップ（削除済みのため）
        delete data.agentConfig;
      }
    }
  }

  return prisma.component.update({
    where: { id },
    data: {
      skillConfig: {
        update: {
          name: data.name.trim(),
          skillType: data.skillType!,
          description: data.description?.trim() || null,
          ...(data.content !== undefined ? { content: data.content } : {}),
          ...(data.input !== undefined ? { input: data.input } : {}),
          ...(data.output !== undefined ? { output: data.output } : {}),
          ...(data.allowedTools !== undefined ? { allowedTools: data.allowedTools || null } : {}),
          ...(data.argumentHint !== undefined ? { argumentHint: data.argumentHint || null } : {}),
          ...(data.disableModelInvocation !== undefined ? { disableModelInvocation: data.disableModelInvocation } : {}),
          // agentConfig更新（存在する場合のみ）
          ...(data.agentConfig
            ? {
                agentConfig: {
                  update: {
                    ...(data.agentConfig.model !== undefined
                      ? { model: data.agentConfig.model || null }
                      : {}),
                    ...(data.agentConfig.tools !== undefined
                      ? { tools: data.agentConfig.tools || null }
                      : {}),
                    ...(data.agentConfig.content !== undefined
                      ? { content: data.agentConfig.content }
                      : {}),
                  },
                },
              }
            : {}),
        },
      },
    },
    include: {
      skillConfig: {
        include: { agentConfig: true },
      },
    },
  });
}

export async function deleteComponent(id: string) {
  const component = await prisma.component.findUnique({
    where: { id },
    include: { skillConfig: true },
  });

  const deleted = await prisma.component.delete({
    where: { id },
  });

  const entityName = component?.skillConfig?.name;
  logAuditEvent({
    action: "DELETE",
    entityType: "Component",
    entityId: id,
    entityName: entityName ?? undefined,
    timestamp: new Date(),
  });

  return deleted;
}

// AgentTeamMember CRUD

export async function addAgentTeamMember(
  agentTeamComponentId: string,
  data: { memberComponentId: string; sortOrder?: number },
) {
  await validateAgentTeamMemberCreate(prisma, {
    componentId: data.memberComponentId,
  });

  try {
    return await prisma.agentTeamMember.create({
      data: {
        agentTeamComponentId,
        componentId: data.memberComponentId,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ValidationError({
        field: "componentId",
        code: "DUPLICATE_MEMBER",
        message: "This agent is already a member of the team",
      });
    }
    throw error;
  }
}

export async function removeAgentTeamMember(
  memberId: string,
  agentTeamComponentId: string,
) {
  // メンバーが指定されたagentTeamComponentに属するか検証
  const member = await prisma.agentTeamMember.findUnique({
    where: { id: memberId },
  });
  if (!member || member.agentTeamComponentId !== agentTeamComponentId) {
    throw new Error(
      "Member does not belong to the specified agent team component",
    );
  }
  return prisma.agentTeamMember.delete({
    where: { id: memberId },
  });
}

// ComponentFile CRUD

export async function getComponentFile(id: string) {
  return prisma.componentFile.findUnique({
    where: { id },
  });
}

export async function createComponentFile(
  componentId: string,
  data: { role: string; filename: string; content: string },
) {
  validateComponentFileData(data);

  const existingCount = await prisma.componentFile.count({
    where: { componentId },
  });

  try {
    return await prisma.componentFile.create({
      data: {
        componentId,
        role: data.role as "TEMPLATE" | "REFERENCE" | "EXAMPLE",
        filename: data.filename.trim(),
        content: data.content,
        sortOrder: existingCount,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ValidationError({
        field: "filename",
        code: "DUPLICATE_FILENAME",
        message: "A file with this filename already exists in this component",
      });
    }
    throw error;
  }
}

export async function updateComponentFile(
  id: string,
  data: { filename: string; content: string },
) {
  const existing = await prisma.componentFile.findUnique({ where: { id } });
  if (!existing) {
    throw new ValidationError({
      field: "id",
      code: "FILE_NOT_FOUND",
      message: "Component file not found",
    });
  }

  validateComponentFileData({
    role: existing.role,
    filename: data.filename,
    content: data.content,
  });

  try {
    return await prisma.componentFile.update({
      where: { id },
      data: {
        filename: data.filename.trim(),
        content: data.content,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ValidationError({
        field: "filename",
        code: "DUPLICATE_FILENAME",
        message: "A file with this filename already exists in this component",
      });
    }
    throw error;
  }
}

export async function deleteComponentFile(id: string) {
  const existing = await prisma.componentFile.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new ValidationError({
      field: "id",
      code: "FILE_NOT_FOUND",
      message: "Component file not found",
    });
  }

  const deleted = await prisma.componentFile.delete({
    where: { id },
  });

  logAuditEvent({
    action: "DELETE",
    entityType: "ComponentFile",
    entityId: id,
    entityName: existing.filename,
    timestamp: new Date(),
  });

  return deleted;
}

// ComponentDependency CRUD

export async function getDependency(id: string) {
  return prisma.componentDependency.findUnique({
    where: { id },
    include: {
      source: { select: { id: true, pluginId: true } },
      target: { select: { id: true, pluginId: true } },
    },
  });
}

export async function createDependency(data: {
  sourceId: string;
  targetId: string;
  order?: number;
}) {
  return prisma.$transaction(async (tx) => {
    await validateDependencyCreate(tx, data);

    const maxOrderResult = await tx.componentDependency.aggregate({
      where: { sourceId: data.sourceId },
      _max: { order: true },
    });
    const nextOrder = (maxOrderResult._max.order ?? -1) + 1;

    try {
      return await tx.componentDependency.create({
        data: {
          sourceId: data.sourceId,
          targetId: data.targetId,
          order: data.order ?? nextOrder,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ValidationError({
          field: "dependency",
          code: "DUPLICATE_DEPENDENCY",
          message: "This dependency already exists",
        });
      }
      throw error;
    }
  });
}

export async function deleteDependency(id: string) {
  return prisma.componentDependency.delete({
    where: { id },
  });
}

export async function reorderDependency(
  id: string,
  direction: "up" | "down",
) {
  const dependency = await prisma.componentDependency.findUnique({
    where: { id },
  });
  if (!dependency) {
    throw new ValidationError({
      field: "id",
      code: "DEPENDENCY_NOT_FOUND",
      message: "Dependency not found",
    });
  }

  const { sourceId, order: currentOrder } = dependency;

  // Find adjacent order value
  let adjacentDependency;
  if (direction === "up") {
    adjacentDependency = await prisma.componentDependency.findFirst({
      where: {
        sourceId,
        order: { lt: currentOrder },
      },
      orderBy: { order: "desc" },
    });
  } else {
    adjacentDependency = await prisma.componentDependency.findFirst({
      where: {
        sourceId,
        order: { gt: currentOrder },
      },
      orderBy: { order: "asc" },
    });
  }

  // Boundary: no adjacent order means we're at the edge
  if (!adjacentDependency) {
    return;
  }

  const adjacentOrder = adjacentDependency.order;
  const tempOrder = -1;

  // Swap all records at currentOrder with all records at adjacentOrder
  // Using 3-step update to avoid unique constraint violations
  await prisma.$transaction([
    prisma.componentDependency.updateMany({
      where: { sourceId, order: currentOrder },
      data: { order: tempOrder },
    }),
    prisma.componentDependency.updateMany({
      where: { sourceId, order: adjacentOrder },
      data: { order: currentOrder },
    }),
    prisma.componentDependency.updateMany({
      where: { sourceId, order: tempOrder },
      data: { order: adjacentOrder },
    }),
  ]);
}

export async function verifyDependenciesOwnership(
  ids: string[],
  pluginId: string,
): Promise<boolean> {
  const dependencies = await prisma.componentDependency.findMany({
    where: { id: { in: ids } },
    include: { source: { select: { pluginId: true } } },
  });
  if (dependencies.length !== ids.length) {
    return false;
  }
  return dependencies.every((dep) => dep.source.pluginId === pluginId);
}

export async function deleteDependenciesBatch(ids: string[]) {
  return prisma.componentDependency.deleteMany({
    where: { id: { in: ids } },
  });
}
