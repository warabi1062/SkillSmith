import { describe, expect, it, vi } from "vitest";
import type { PrismaLike } from "../dependency.server";
import { validateDependencyCreate } from "../dependency.server";
import { ValidationError } from "../agent-team.server";

function createMockPrisma() {
  return {
    component: {
      findUnique: vi.fn(),
    },
    componentDependency: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

describe("validateDependencyCreate", () => {
  // --- Success case ---

  it("accepts valid dependency between components in the same plugin", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique
      .mockResolvedValueOnce({
        id: "source-1",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "ENTRY_POINT" },
      })
      .mockResolvedValueOnce({
        id: "target-1",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "WORKER" },
      });

    await expect(
      validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "source-1",
        targetId: "target-1",
      }),
    ).resolves.toBeUndefined();
  });

  it("accepts ENTRY_POINT -> WORKER_WITH_SUB_AGENT dependency", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique
      .mockResolvedValueOnce({
        id: "source-1",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "ENTRY_POINT" },
      })
      .mockResolvedValueOnce({
        id: "target-1",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "WORKER_WITH_SUB_AGENT" },
      });

    await expect(
      validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "source-1",
        targetId: "target-1",
      }),
    ).resolves.toBeUndefined();
  });

  it("accepts ENTRY_POINT -> WORKER_WITH_AGENT_TEAM dependency", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique
      .mockResolvedValueOnce({
        id: "source-1",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "ENTRY_POINT" },
      })
      .mockResolvedValueOnce({
        id: "target-1",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "WORKER_WITH_AGENT_TEAM" },
      });

    await expect(
      validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "source-1",
        targetId: "target-1",
      }),
    ).resolves.toBeUndefined();
  });

  // --- SOURCE_REQUIRED ---

  it("throws SOURCE_REQUIRED when sourceId is empty", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "",
        targetId: "target-1",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("sourceId");
      expect((e as ValidationError).code).toBe("SOURCE_REQUIRED");
    }
  });

  // --- TARGET_REQUIRED ---

  it("throws TARGET_REQUIRED when targetId is empty", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "source-1",
        targetId: "",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("targetId");
      expect((e as ValidationError).code).toBe("TARGET_REQUIRED");
    }
  });

  // --- SELF_REFERENCE ---

  it("throws SELF_REFERENCE when sourceId equals targetId", async () => {
    const mockPrisma = createMockPrisma();

    try {
      await validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "comp-1",
        targetId: "comp-1",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("SELF_REFERENCE");
    }
  });

  // --- COMPONENT_NOT_FOUND (source) ---

  it("throws COMPONENT_NOT_FOUND when source does not exist", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValueOnce(null);

    try {
      await validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "nonexistent",
        targetId: "target-1",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("sourceId");
      expect((e as ValidationError).code).toBe("COMPONENT_NOT_FOUND");
    }
  });

  // --- COMPONENT_NOT_FOUND (target) ---

  it("throws COMPONENT_NOT_FOUND when target does not exist", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique
      .mockResolvedValueOnce({
        id: "source-1",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: null,
      })
      .mockResolvedValueOnce(null);

    try {
      await validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "source-1",
        targetId: "nonexistent",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("targetId");
      expect((e as ValidationError).code).toBe("COMPONENT_NOT_FOUND");
    }
  });

  // --- CROSS_PLUGIN_DEPENDENCY ---

  it("throws CROSS_PLUGIN_DEPENDENCY when components are in different plugins", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique
      .mockResolvedValueOnce({
        id: "source-1",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: null,
      })
      .mockResolvedValueOnce({
        id: "target-1",
        type: "SKILL",
        pluginId: "plugin-2",
        skillConfig: null,
      });

    try {
      await validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "source-1",
        targetId: "target-1",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("CROSS_PLUGIN_DEPENDENCY");
    }
  });

  // --- INVALID_SKILL_TYPE (EntryPoint -> ENTRY_POINT) ---

  it("throws INVALID_SKILL_TYPE when EntryPoint depends on ENTRY_POINT skill", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique
      .mockResolvedValueOnce({
        id: "ep-1",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "ENTRY_POINT" },
      })
      .mockResolvedValueOnce({
        id: "ep-2",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "ENTRY_POINT" },
      });

    try {
      await validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "ep-1",
        targetId: "ep-2",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("INVALID_SKILL_TYPE");
    }
  });

  // --- CIRCULAR_DEPENDENCY (direct) ---

  it("throws CIRCULAR_DEPENDENCY for direct circular reference", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique
      .mockResolvedValueOnce({
        id: "a",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "WORKER" },
      })
      .mockResolvedValueOnce({
        id: "b",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "WORKER" },
      });

    // Existing: b -> a. Adding a -> b would create a cycle.
    mockPrisma.componentDependency.findMany.mockResolvedValue([
      { sourceId: "b", targetId: "a" },
    ]);

    try {
      await validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "a",
        targetId: "b",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("CIRCULAR_DEPENDENCY");
    }
  });

  // --- CIRCULAR_DEPENDENCY (indirect: a -> b -> c -> a) ---

  it("throws CIRCULAR_DEPENDENCY for indirect circular reference", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique
      .mockResolvedValueOnce({
        id: "a",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "WORKER" },
      })
      .mockResolvedValueOnce({
        id: "c",
        type: "SKILL",
        pluginId: "plugin-1",
        skillConfig: { skillType: "WORKER" },
      });

    // Existing: c -> b, b -> a. Adding a -> c would create: a -> c -> b -> a
    mockPrisma.componentDependency.findMany.mockResolvedValue([
      { sourceId: "c", targetId: "b" },
      { sourceId: "b", targetId: "a" },
    ]);

    try {
      await validateDependencyCreate(mockPrisma as unknown as PrismaLike, {
        sourceId: "a",
        targetId: "c",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("CIRCULAR_DEPENDENCY");
    }
  });
});
