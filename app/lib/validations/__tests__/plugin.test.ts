import { describe, expect, it } from "vitest";
import { validatePluginData } from "../plugin.server";
import { ValidationError } from "../agent-team.server";

describe("validatePluginData", () => {
  // --- Success case ---

  it("accepts valid plugin data", () => {
    expect(() =>
      validatePluginData({ name: "my-plugin", description: "A plugin" }),
    ).not.toThrow();
  });

  it("accepts valid plugin data without description", () => {
    expect(() => validatePluginData({ name: "my-plugin" })).not.toThrow();
  });

  // --- NAME_REQUIRED ---

  it("throws NAME_REQUIRED when name is empty", () => {
    try {
      validatePluginData({ name: "" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("name");
      expect((e as ValidationError).code).toBe("NAME_REQUIRED");
    }
  });

  it("throws NAME_REQUIRED when name is whitespace only", () => {
    try {
      validatePluginData({ name: "   " });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("NAME_REQUIRED");
    }
  });

  // --- NAME_TOO_LONG (boundary: 100) ---

  it("accepts name at exactly 100 characters", () => {
    expect(() => validatePluginData({ name: "a".repeat(100) })).not.toThrow();
  });

  it("throws NAME_TOO_LONG for name at 101 characters", () => {
    try {
      validatePluginData({ name: "a".repeat(101) });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("NAME_TOO_LONG");
    }
  });

  // --- DESCRIPTION_TOO_LONG (boundary: 500) ---

  it("accepts description at exactly 500 characters", () => {
    expect(() =>
      validatePluginData({ name: "p", description: "a".repeat(500) }),
    ).not.toThrow();
  });

  it("throws DESCRIPTION_TOO_LONG for description at 501 characters", () => {
    try {
      validatePluginData({ name: "p", description: "a".repeat(501) });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("DESCRIPTION_TOO_LONG");
    }
  });
});
