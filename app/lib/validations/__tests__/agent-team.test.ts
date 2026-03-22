import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../../generated/prisma/client";
import {
  validateAgentTeamMemberCreate,
  ValidationError,
} from "../agent-team.server";

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

describe("validateAgentTeamMemberCreate", () => {
  // --- Success case ---

  it("accepts WORKER_WITH_SUB_AGENT skill", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "SKILL",
      skillConfig: {
        skillType: "WORKER_WITH_SUB_AGENT",
        agentConfig: { id: "ac-1" },
      },
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

  // --- INVALID_COMPONENT_TYPE (WORKER skill) ---

  it("throws INVALID_COMPONENT_TYPE when component is WORKER skill", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "SKILL",
      skillConfig: {
        skillType: "WORKER",
        agentConfig: null,
      },
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

  // --- INVALID_COMPONENT_TYPE (ENTRY_POINT skill) ---

  it("throws INVALID_COMPONENT_TYPE when component is ENTRY_POINT skill", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "SKILL",
      skillConfig: {
        skillType: "ENTRY_POINT",
        agentConfig: null,
      },
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

  // --- INVALID_COMPONENT_TYPE (WORKER_WITH_AGENT_TEAM skill) ---

  it("throws INVALID_COMPONENT_TYPE when component is WORKER_WITH_AGENT_TEAM skill", async () => {
    const mockPrisma = createMockPrisma();
    mockPrisma.component.findUnique.mockResolvedValue({
      id: "comp-1",
      type: "SKILL",
      skillConfig: {
        skillType: "WORKER_WITH_AGENT_TEAM",
        agentConfig: null,
      },
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
