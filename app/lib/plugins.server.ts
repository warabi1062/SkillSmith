import { Prisma } from "../generated/prisma/client";
import { prisma } from "./db.server";
import {
  validateAgentTeamCreate,
  validateAgentTeamMemberCreate,
  validateComponentFileData,
  validateDependencyCreate,
  validateMainRoleUniqueness,
  validateOutputSchemaFieldData,
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
          skillConfig: true,
          agentConfig: true,
          dependenciesFrom: {
            select: { id: true, targetId: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      agentTeams: {
        include: {
          orchestrator: {
            include: { skillConfig: true },
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
  return prisma.plugin.delete({
    where: { id },
  });
}

// Component CRUD

export async function getComponent(id: string) {
  return prisma.component.findUnique({
    where: { id },
    include: {
      skillConfig: true,
      agentConfig: true,
      files: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createComponent(
  pluginId: string,
  data: {
    type: "SKILL" | "AGENT";
    name: string;
    description?: string;
    skillType?: "ENTRY_POINT" | "WORKER";
  },
) {
  return prisma.component.create({
    data: {
      pluginId,
      type: data.type,
      ...(data.type === "SKILL"
        ? {
            skillConfig: {
              create: {
                name: data.name.trim(),
                skillType: data.skillType!,
                description: data.description?.trim() || null,
              },
            },
          }
        : {
            agentConfig: {
              create: {
                name: data.name.trim(),
                description: data.description!.trim(),
              },
            },
          }),
    },
    include: {
      skillConfig: true,
      agentConfig: true,
    },
  });
}

export async function updateComponent(
  id: string,
  data: {
    type: "SKILL" | "AGENT";
    name: string;
    description?: string;
    skillType?: "ENTRY_POINT" | "WORKER";
  },
) {
  return prisma.component.update({
    where: { id },
    data: {
      ...(data.type === "SKILL"
        ? {
            skillConfig: {
              update: {
                name: data.name.trim(),
                skillType: data.skillType!,
                description: data.description?.trim() || null,
              },
            },
          }
        : {
            agentConfig: {
              update: {
                name: data.name.trim(),
                description: data.description!.trim(),
              },
            },
          }),
    },
    include: {
      skillConfig: true,
      agentConfig: true,
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

  return prisma.component.delete({
    where: { id },
  });
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
            include: { agentConfig: true },
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
    include: {
      outputSchemaFields: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function createComponentFile(
  componentId: string,
  data: { role: string; filename: string; content: string },
) {
  validateComponentFileData(data);
  await validateMainRoleUniqueness(prisma, componentId, data.role);

  const existingCount = await prisma.componentFile.count({
    where: { componentId },
  });

  try {
    return await prisma.componentFile.create({
      data: {
        componentId,
        role: data.role as "MAIN" | "TEMPLATE" | "REFERENCE" | "EXAMPLE" | "OUTPUT_SCHEMA",
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

  return prisma.componentFile.delete({
    where: { id },
  });
}

// OutputSchemaField CRUD

export async function getOutputSchemaField(id: string) {
  return prisma.outputSchemaField.findUnique({
    where: { id },
  });
}

export async function createOutputSchemaField(
  componentFileId: string,
  data: {
    name: string;
    fieldType: string;
    required: boolean;
    description?: string;
    enumValues?: string;
    placeholder?: string;
  },
) {
  await validateOutputSchemaFieldData(prisma, {
    componentFileId,
    name: data.name,
    fieldType: data.fieldType,
    required: data.required,
    enumValues: data.enumValues,
  });

  const maxSortOrder = await prisma.outputSchemaField.aggregate({
    where: { componentFileId },
    _max: { sortOrder: true },
  });
  const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  return prisma.outputSchemaField.create({
    data: {
      componentFileId,
      name: data.name.trim(),
      fieldType: data.fieldType as "TEXT" | "ENUM" | "LIST" | "TABLE" | "GROUP",
      required: data.required,
      description: data.description?.trim() || null,
      sortOrder: nextSortOrder,
      enumValues: data.enumValues?.trim() || null,
      placeholder: data.placeholder?.trim() || null,
    },
  });
}

export async function updateOutputSchemaField(
  id: string,
  data: {
    name: string;
    fieldType: string;
    required: boolean;
    description?: string;
    enumValues?: string;
    placeholder?: string;
  },
) {
  const existing = await prisma.outputSchemaField.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new ValidationError({
      field: "id",
      code: "FIELD_NOT_FOUND",
      message: "Output schema field not found",
    });
  }

  await validateOutputSchemaFieldData(prisma, {
    componentFileId: existing.componentFileId,
    name: data.name,
    fieldType: data.fieldType,
    required: data.required,
    enumValues: data.enumValues,
    excludeFieldId: id,
  });

  return prisma.outputSchemaField.update({
    where: { id },
    data: {
      name: data.name.trim(),
      fieldType: data.fieldType as "TEXT" | "ENUM" | "LIST" | "TABLE" | "GROUP",
      required: data.required,
      description: data.description?.trim() || null,
      enumValues: data.enumValues?.trim() || null,
      placeholder: data.placeholder?.trim() || null,
    },
  });
}

export async function deleteOutputSchemaField(id: string) {
  const existing = await prisma.outputSchemaField.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new ValidationError({
      field: "id",
      code: "FIELD_NOT_FOUND",
      message: "Output schema field not found",
    });
  }

  return prisma.outputSchemaField.delete({
    where: { id },
  });
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
}) {
  await validateDependencyCreate(prisma, data);

  const existingCount = await prisma.componentDependency.count({
    where: { sourceId: data.sourceId },
  });

  try {
    return await prisma.componentDependency.create({
      data: {
        sourceId: data.sourceId,
        targetId: data.targetId,
        order: existingCount,
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
}

export async function deleteDependency(id: string) {
  return prisma.componentDependency.delete({
    where: { id },
  });
}

export async function reorderOutputSchemaField(
  id: string,
  direction: "up" | "down",
) {
  const field = await prisma.outputSchemaField.findUnique({
    where: { id },
  });
  if (!field) {
    throw new ValidationError({
      field: "id",
      code: "FIELD_NOT_FOUND",
      message: "Output schema field not found",
    });
  }

  // Find adjacent field based on direction
  // Use sortOrder + id for stable ordering
  let adjacentField;
  if (direction === "up") {
    adjacentField = await prisma.outputSchemaField.findFirst({
      where: {
        componentFileId: field.componentFileId,
        parentId: null,
        OR: [
          { sortOrder: { lt: field.sortOrder } },
          {
            sortOrder: field.sortOrder,
            id: { lt: field.id },
          },
        ],
      },
      orderBy: [{ sortOrder: "desc" }, { id: "desc" }],
    });
  } else {
    adjacentField = await prisma.outputSchemaField.findFirst({
      where: {
        componentFileId: field.componentFileId,
        parentId: null,
        OR: [
          { sortOrder: { gt: field.sortOrder } },
          {
            sortOrder: field.sortOrder,
            id: { gt: field.id },
          },
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
  }

  // Guard: no adjacent field means we're at the boundary
  if (!adjacentField) {
    return;
  }

  // Swap sortOrders in a transaction
  await prisma.$transaction([
    prisma.outputSchemaField.update({
      where: { id: field.id },
      data: { sortOrder: adjacentField.sortOrder },
    }),
    prisma.outputSchemaField.update({
      where: { id: adjacentField.id },
      data: { sortOrder: field.sortOrder },
    }),
  ]);
}
