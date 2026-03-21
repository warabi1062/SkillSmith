import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../../generated/prisma/client";
import {
  validateAgentTeamCreate,
  validateAgentTeamData,
  validateAgentTeamMemberCreate,
  ValidationError,
} from "../agent-team.server";

describe("validateAgentTeamData", () => {
  // --- Success case ---

  it("accepts valid agent team data", () => {
    expect(() =>
      validateAgentTeamData({ name: "my-team", description: "A team" }),
    ).not.toThrow();
  });

  it("accepts valid agent team data without description", () => {
    expect(() => validateAgentTeamData({ name: "my-team" })).not.toThrow();
  });

  // --- NAME_REQUIRED ---

  it("throws NAME_REQUIRED when name is empty", () => {
    try {
      validateAgentTeamData({ name: "" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("name");
      expect((e as ValidationError).code).toBe("NAME_REQUIRED");
    }
  });

  it("throws NAME_REQUIRED when name is whitespace only", () => {
    try {
      validateAgentTeamData({ name: "   " });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("NAME_REQUIRED");
    }
  });

  // --- NAME_TOO_LONG (boundary: 100) ---

  it("accepts name at exactly 100 characters", () => {
    expect(() =>
      validateAgentTeamData({ name: "a".repeat(100) }),
    ).not.toThrow();
  });

  it("throws NAME_TOO_LONG for name at 101 characters", () => {
    try {
      validateAgentTeamData({ name: "a".repeat(101) });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("NAME_TOO_LONG");
    }
  });

  // --- DESCRIPTION_TOO_LONG (boundary: 500) ---

  it("accepts description at exactly 500 characters", () => {
    expect(() =>
      validateAgentTeamData({ name: "t", description: "a".repeat(500) }),
    ).not.toThrow();
  });

  it("throws DESCRIPTION_TOO_LONG for description at 501 characters", () => {
    try {
      validateAgentTeamData({ name: "t", description: "a".repeat(501) });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("DESCRIPTION_TOO_LONG");
    }
  });
});

type PrismaLike = {
  component: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

function createMockPrisma(): PrismaLike {
  return {
    component: {
      findUnique: vi.fn(),
    },
  };
}

describe("validateAgentTeamCreate", () => {
  // --- Success case ---

  it("accepts valid ENTRY_POINT SKILL component", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "SKILL",
      skillConfig: { skillType: "ENTRY_POINT" },
    });

    await expect(
      validateAgentTeamCreate(mockPrisma as unknown as PrismaClient, {
        orchestratorId: "comp-1",
      }),
    ).resolves.toBeUndefined();
  });

  // --- COMPONENT_NOT_FOUND ---

  it("throws COMPONENT_NOT_FOUND when component does not exist", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue(null);

    try {
      await validateAgentTeamCreate(mockPrisma as unknown as PrismaClient, {
        orchestratorId: "nonexistent",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("orchestratorId");
      expect((e as ValidationError).code).toBe("COMPONENT_NOT_FOUND");
    }
  });

  // --- INVALID_COMPONENT_TYPE ---

  it("throws INVALID_COMPONENT_TYPE when component is AGENT", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "AGENT",
    });

    try {
      await validateAgentTeamCreate(mockPrisma as unknown as PrismaClient, {
        orchestratorId: "comp-1",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("INVALID_COMPONENT_TYPE");
    }
  });

  // --- SKILL_CONFIG_NOT_FOUND ---

  it("throws SKILL_CONFIG_NOT_FOUND when SKILL has no skillConfig", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "SKILL",
      skillConfig: null,
    });

    try {
      await validateAgentTeamCreate(mockPrisma as unknown as PrismaClient, {
        orchestratorId: "comp-1",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("SKILL_CONFIG_NOT_FOUND");
    }
  });

  // --- INVALID_SKILL_TYPE ---

  it("throws INVALID_SKILL_TYPE when SKILL is WORKER", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "SKILL",
      skillConfig: { skillType: "WORKER" },
    });

    try {
      await validateAgentTeamCreate(mockPrisma as unknown as PrismaClient, {
        orchestratorId: "comp-1",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("INVALID_SKILL_TYPE");
    }
  });
});

describe("validateAgentTeamMemberCreate", () => {
  // --- Success case ---

  it("accepts valid AGENT component", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "AGENT",
    });

    await expect(
      validateAgentTeamMemberCreate(mockPrisma as unknown as PrismaClient, {
        componentId: "comp-1",
      }),
    ).resolves.toBeUndefined();
  });

  // --- COMPONENT_NOT_FOUND ---

  it("throws COMPONENT_NOT_FOUND when component does not exist", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue(null);

    try {
      await validateAgentTeamMemberCreate(
        mockPrisma as unknown as PrismaClient,
        { componentId: "nonexistent" },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("COMPONENT_NOT_FOUND");
    }
  });

  // --- INVALID_COMPONENT_TYPE ---

  it("throws INVALID_COMPONENT_TYPE when component is SKILL", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "SKILL",
    });

    try {
      await validateAgentTeamMemberCreate(
        mockPrisma as unknown as PrismaClient,
        { componentId: "comp-1" },
      );
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("INVALID_COMPONENT_TYPE");
    }
  });
});
