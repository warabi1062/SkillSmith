import { Prisma } from "../generated/prisma/client";
import { logAuditEvent } from "./audit-log.server";
import { prisma } from "./db.server";
import {
  validateAgentTeamCreate,
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
        },
        orderBy: { createdAt: "asc" },
      },
      agentTeams: {
        include: {
          orchestrator: {
            include: { skillConfig: true },
          },
          members: {
            include: {
              component: {
                include: {
                  skillConfig: { include: { agentConfig: true } },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          _count: {
            select: { members: true },
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
    skillType?: "ENTRY_POINT" | "WORKER";
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
          // WORKER Skill作成時にagentConfigも同時作成
          ...(data.skillType === "WORKER"
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
    skillType?: "ENTRY_POINT" | "WORKER";
    content?: string;
    input?: string;
    output?: string;
    agentConfig?: {
      model?: string;
      tools?: string;
      disallowedTools?: string;
      permissionMode?: string;
      hooks?: string;
      memory?: string;
      content?: string;
    };
  },
) {
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
                    ...(data.agentConfig.disallowedTools !== undefined
                      ? { disallowedTools: data.agentConfig.disallowedTools || null }
                      : {}),
                    ...(data.agentConfig.permissionMode !== undefined
                      ? { permissionMode: data.agentConfig.permissionMode || null }
                      : {}),
                    ...(data.agentConfig.hooks !== undefined
                      ? { hooks: data.agentConfig.hooks || null }
                      : {}),
                    ...(data.agentConfig.memory !== undefined
                      ? { memory: data.agentConfig.memory || null }
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
  const orchestratedTeams = await prisma.agentTeam.findMany({
    where: { orchestratorId: id },
    select: { name: true },
  });

  if (orchestratedTeams.length > 0) {
    const teamNames = orchestratedTeams.map((t) => t.name).join(", ");
    throw new ValidationError({
      field: "orchestratedTeams",
      code: "HAS_DEPENDENT_TEAMS",
      message: `This component is used as orchestrator in the following teams: ${teamNames}. Please remove these teams first.`,
    });
  }

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

// AgentTeam CRUD

export async function getAgentTeam(id: string) {
  return prisma.agentTeam.findUnique({
    where: { id },
    include: {
      orchestrator: {
        include: { skillConfig: true },
      },
      members: {
        include: {
          component: {
            include: {
              skillConfig: { include: { agentConfig: true } },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function getAgentTeams(pluginId: string) {
  return prisma.agentTeam.findMany({
    where: { pluginId },
    include: {
      orchestrator: {
        include: { skillConfig: true },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createAgentTeam(
  pluginId: string,
  data: { orchestratorId: string; name: string; description?: string },
) {
  await validateAgentTeamCreate(prisma, {
    orchestratorId: data.orchestratorId,
  });

  return prisma.agentTeam.create({
    data: {
      pluginId,
      orchestratorId: data.orchestratorId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
    },
  });
}

export async function updateAgentTeam(
  id: string,
  data: { name: string; description?: string },
) {
  return prisma.agentTeam.update({
    where: { id },
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
    },
  });
}

export async function deleteAgentTeam(id: string) {
  return prisma.agentTeam.delete({
    where: { id },
  });
}

export async function addAgentTeamMember(
  teamId: string,
  data: { componentId: string; sortOrder?: number },
) {
  await validateAgentTeamMemberCreate(prisma, {
    componentId: data.componentId,
  });

  try {
    return await prisma.agentTeamMember.create({
      data: {
        teamId,
        componentId: data.componentId,
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

export async function removeAgentTeamMember(memberId: string) {
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

