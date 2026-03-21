import { describe, expect, it } from "vitest";
import { validateAgentTeamData, ValidationError } from "../agent-team.server";

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
