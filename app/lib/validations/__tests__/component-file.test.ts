import { describe, expect, it } from "vitest";
import { validateComponentFileData } from "../component-file.server";
import { ValidationError } from "../agent-team.server";

describe("validateComponentFileData", () => {
  const validData = { role: "MAIN", filename: "SKILL.md", content: "" };

  // --- Success cases ---

  it("accepts valid MAIN file", () => {
    expect(() => validateComponentFileData(validData)).not.toThrow();
  });

  it("accepts valid TEMPLATE file", () => {
    expect(() =>
      validateComponentFileData({
        role: "TEMPLATE",
        filename: "template.md",
        content: "x",
      }),
    ).not.toThrow();
  });

  it("accepts valid REFERENCE file", () => {
    expect(() =>
      validateComponentFileData({
        role: "REFERENCE",
        filename: "ref.md",
        content: "",
      }),
    ).not.toThrow();
  });

  it("accepts valid EXAMPLE file", () => {
    expect(() =>
      validateComponentFileData({
        role: "EXAMPLE",
        filename: "example.md",
        content: "",
      }),
    ).not.toThrow();
  });

  it("accepts valid OUTPUT_SCHEMA file", () => {
    expect(() =>
      validateComponentFileData({
        role: "OUTPUT_SCHEMA",
        filename: "schema.md",
        content: "",
      }),
    ).not.toThrow();
  });

  // --- INVALID_ROLE ---

  it("throws INVALID_ROLE for unknown role", () => {
    try {
      validateComponentFileData({
        role: "UNKNOWN",
        filename: "f.md",
        content: "",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe("role");
      expect((e as ValidationError).code).toBe("INVALID_ROLE");
    }
  });

  // --- FILENAME_REQUIRED ---

  it("throws FILENAME_REQUIRED when filename is empty", () => {
    try {
      validateComponentFileData({ role: "MAIN", filename: "", content: "" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("FILENAME_REQUIRED");
    }
  });

  it("throws FILENAME_REQUIRED when filename is whitespace only", () => {
    try {
      validateComponentFileData({ role: "MAIN", filename: "   ", content: "" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("FILENAME_REQUIRED");
    }
  });

  // --- FILENAME_TOO_LONG (boundary: 255) ---

  it("accepts filename at exactly 255 characters", () => {
    const filename = "a".repeat(255);
    expect(() =>
      validateComponentFileData({ role: "MAIN", filename, content: "" }),
    ).not.toThrow();
  });

  it("throws FILENAME_TOO_LONG for filename at 256 characters", () => {
    const filename = "a".repeat(256);
    try {
      validateComponentFileData({ role: "MAIN", filename, content: "" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("FILENAME_TOO_LONG");
    }
  });

  // --- FILENAME_NULL_BYTE ---

  it("throws FILENAME_NULL_BYTE for filename with null byte", () => {
    try {
      validateComponentFileData({
        role: "MAIN",
        filename: "file\0.md",
        content: "",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("FILENAME_NULL_BYTE");
    }
  });

  // --- FILENAME_ABSOLUTE_PATH ---

  it("throws FILENAME_ABSOLUTE_PATH for absolute path", () => {
    try {
      validateComponentFileData({
        role: "MAIN",
        filename: "/etc/passwd",
        content: "",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("FILENAME_ABSOLUTE_PATH");
    }
  });

  // --- FILENAME_PATH_TRAVERSAL ---

  it("throws FILENAME_PATH_TRAVERSAL for path traversal", () => {
    try {
      validateComponentFileData({
        role: "MAIN",
        filename: "../etc/passwd",
        content: "",
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe("FILENAME_PATH_TRAVERSAL");
    }
  });
});
