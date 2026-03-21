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

  it("accepts valid AGENT component", () => {
    expect(() =>
      validateComponentData({
        type: "AGENT",
        name: "my-agent",
        description: "Agent description",
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
        type: "AGENT",
        name,
        description: "desc",
      }),
    ).not.toThrow();
  });

  it("throws NAME_TOO_LONG for name at 101 characters", () => {
    const name = "a".repeat(101);
    try {
      validateComponentData({ type: "AGENT", name, description: "desc" });
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
        type: "AGENT",
        name: "MySkill",
        description: "desc",
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
        type: "AGENT",
        name: "-my-skill",
        description: "desc",
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
        type: "AGENT",
        name: "my-agent",
        description: "a".repeat(500),
      }),
    ).not.toThrow();
  });

  it("throws DESCRIPTION_TOO_LONG for description at 501 characters", () => {
    try {
      validateComponentData({
        type: "AGENT",
        name: "my-agent",
        description: "a".repeat(501),
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

  // --- DESCRIPTION_REQUIRED (AGENT) ---

  it("throws DESCRIPTION_REQUIRED when AGENT has no description", () => {
    try {
      validateComponentData({ type: "AGENT", name: "my-agent" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("DESCRIPTION_REQUIRED");
    }
  });
});
