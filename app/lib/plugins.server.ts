import { prisma } from "./db.server";

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
