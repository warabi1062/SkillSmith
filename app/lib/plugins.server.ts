import { Prisma } from "../generated/prisma/client";
import { prisma } from "./db.server";
import {
  validateAgentTeamCreate,
  validateAgentTeamMemberCreate,
  validateComponentFileData,
  validateMainRoleUniqueness,
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
      outputSchemaFields: true,
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
  return prisma.componentFile.delete({
    where: { id },
  });
}
