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
