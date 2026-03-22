import { describe, expect, it } from "vitest";
import { validateComponentData } from "../component.server";
import { ValidationError } from "../agent-team.server";

describe("validateComponentData", () => {
  // --- Success cases ---

  it("accepts valid SKILL component with ENTRY_POINT skillType", () => {
    expect(() =>
      validateComponentData({
        type: "SKILL",
        name: "my-skill",
        description: "A test skill",
        skillType: "ENTRY_POINT",
      }),
    ).not.toThrow();
  });

  it("accepts valid SKILL component with WORKER skillType", () => {
    expect(() =>
      validateComponentData({
        type: "SKILL",
        name: "worker-1",
        skillType: "WORKER",
      }),
    ).not.toThrow();
  });

  it("accepts valid SKILL component with WORKER_WITH_SUB_AGENT skillType", () => {
    expect(() =>
      validateComponentData({
        type: "SKILL",
        name: "worker-agent-1",
        skillType: "WORKER_WITH_SUB_AGENT",
      }),
    ).not.toThrow();
  });

  it("accepts valid SKILL component with WORKER_WITH_AGENT_TEAM skillType", () => {
    expect(() =>
      validateComponentData({
        type: "SKILL",
        name: "worker-team-1",
        skillType: "WORKER_WITH_AGENT_TEAM",
      }),
    ).not.toThrow();
  });

  // --- INVALID_TYPE ---

  it("throws INVALID_TYPE for unknown type", () => {
    try {
      validateComponentData({ type: "UNKNOWN", name: "x" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("type");
      expect((e as ValidationError).code).toBe("INVALID_TYPE");
    }
  });

  it("throws INVALID_TYPE for AGENT type (AGENT型は廃止)", () => {
    try {
      validateComponentData({
        type: "AGENT",
        name: "my-agent",
        description: "Agent description",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("type");
      expect((e as ValidationError).code).toBe("INVALID_TYPE");
    }
  });

  // --- NAME_REQUIRED ---

  it("throws NAME_REQUIRED when name is empty", () => {
    try {
      validateComponentData({ type: "SKILL", name: "" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("name");
      expect((e as ValidationError).code).toBe("NAME_REQUIRED");
    }
  });

  it("throws NAME_REQUIRED when name is whitespace only", () => {
    try {
      validateComponentData({ type: "SKILL", name: "   " });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("NAME_REQUIRED");
    }
  });

  // --- NAME_TOO_LONG (boundary: 100) ---

  it("accepts name at exactly 100 characters", () => {
    const name = "a".repeat(100);
    expect(() =>
      validateComponentData({
        type: "SKILL",
        name,
        skillType: "WORKER",
      }),
    ).not.toThrow();
  });

  it("throws NAME_TOO_LONG for name at 101 characters", () => {
    const name = "a".repeat(101);
    try {
      validateComponentData({ type: "SKILL", name, skillType: "WORKER" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("NAME_TOO_LONG");
    }
  });

  // --- INVALID_NAME_FORMAT ---

  it("throws INVALID_NAME_FORMAT for uppercase letters", () => {
    try {
      validateComponentData({
        type: "SKILL",
        name: "MySkill",
        skillType: "WORKER",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("INVALID_NAME_FORMAT");
    }
  });

  it("throws INVALID_NAME_FORMAT for name starting with hyphen", () => {
    try {
      validateComponentData({
        type: "SKILL",
        name: "-my-skill",
        skillType: "WORKER",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("INVALID_NAME_FORMAT");
    }
  });

  // --- DESCRIPTION_TOO_LONG (boundary: 500) ---

  it("accepts description at exactly 500 characters", () => {
    expect(() =>
      validateComponentData({
        type: "SKILL",
        name: "my-skill",
        description: "a".repeat(500),
        skillType: "WORKER",
      }),
    ).not.toThrow();
  });

  it("throws DESCRIPTION_TOO_LONG for description at 501 characters", () => {
    try {
      validateComponentData({
        type: "SKILL",
        name: "my-skill",
        description: "a".repeat(501),
        skillType: "WORKER",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("DESCRIPTION_TOO_LONG");
    }
  });

  // --- SKILL_TYPE_REQUIRED ---

  it("throws SKILL_TYPE_REQUIRED when skillType is missing for SKILL", () => {
    try {
      validateComponentData({ type: "SKILL", name: "my-skill" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("SKILL_TYPE_REQUIRED");
    }
  });

  // --- INVALID_SKILL_TYPE ---

  it("throws INVALID_SKILL_TYPE for unknown skillType", () => {
    try {
      validateComponentData({
        type: "SKILL",
        name: "my-skill",
        skillType: "CROSS_CUTTING",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("INVALID_SKILL_TYPE");
    }
  });
});
