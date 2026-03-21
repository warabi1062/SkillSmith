import { describe, expect, it } from "vitest";
import {
  serializeFrontmatter,
  parseJsonArrayField,
  checkHooksField,
} from "../frontmatter.server";

describe("serializeFrontmatter", () => {
  it("returns empty frontmatter when all values are null/undefined", () => {
    const result = serializeFrontmatter({ a: null, b: undefined });
    expect(result).toBe("---\n---");
  });

  it("serializes simple string values", () => {
    const result = serializeFrontmatter({ name: "my-skill" });
    expect(result).toBe("---\nname: my-skill\n---");
  });

  it("serializes boolean values", () => {
    const result = serializeFrontmatter({
      enabled: true,
      disabled: false,
    });
    expect(result).toBe("---\nenabled: true\ndisabled: false\n---");
  });

  it("serializes number values", () => {
    const result = serializeFrontmatter({ count: 42 });
    expect(result).toBe("---\ncount: 42\n---");
  });

  it("serializes array values as YAML lists", () => {
    const result = serializeFrontmatter({ tools: ["Read", "Write"] });
    expect(result).toBe("---\ntools: \n  - Read\n  - Write\n---");
  });

  it("omits empty arrays", () => {
    const result = serializeFrontmatter({ tools: [] });
    expect(result).toBe("---\n---");
  });

  it("quotes strings containing colon", () => {
    const result = serializeFrontmatter({ desc: "key: value" });
    expect(result).toContain('"key: value"');
  });

  it("quotes strings containing hash", () => {
    const result = serializeFrontmatter({ desc: "foo # comment" });
    expect(result).toContain('"foo # comment"');
  });

  it("quotes strings with leading whitespace", () => {
    const result = serializeFrontmatter({ desc: " leading" });
    expect(result).toContain('" leading"');
  });

  it("quotes strings with trailing whitespace", () => {
    const result = serializeFrontmatter({ desc: "trailing " });
    expect(result).toContain('"trailing "');
  });

  it("quotes empty strings", () => {
    const result = serializeFrontmatter({ desc: "" });
    expect(result).toContain('desc: ""');
  });

  it("quotes strings containing pipe character", () => {
    const result = serializeFrontmatter({ desc: "foo | bar" });
    expect(result).toContain('"foo | bar"');
  });

  it("quotes strings containing ampersand", () => {
    const result = serializeFrontmatter({ desc: "foo & bar" });
    expect(result).toContain('"foo & bar"');
  });

  it("quotes strings containing asterisk", () => {
    const result = serializeFrontmatter({ desc: "*bold*" });
    expect(result).toContain('"*bold*"');
  });

  it("quotes strings containing exclamation mark", () => {
    const result = serializeFrontmatter({ desc: "!tag" });
    expect(result).toContain('"!tag"');
  });

  it("quotes strings containing greater-than", () => {
    const result = serializeFrontmatter({ desc: "> folded" });
    expect(result).toContain('"> folded"');
  });

  it("escapes double quotes inside quoted strings", () => {
    const result = serializeFrontmatter({ desc: 'say "hello"' });
    expect(result).toContain('"say \\"hello\\""');
  });

  it("escapes newlines inside quoted strings", () => {
    const result = serializeFrontmatter({ desc: "line1\nline2" });
    expect(result).toContain('"line1\\nline2"');
  });

  it("escapes backslashes inside quoted strings", () => {
    // backslash + colon forces quoting, then backslash must be escaped
    const result = serializeFrontmatter({ desc: "path\\to: here" });
    expect(result).toContain('"path\\\\to: here"');
  });

  it("does not quote plain alphanumeric strings", () => {
    const result = serializeFrontmatter({ name: "my-skill-123" });
    expect(result).toBe("---\nname: my-skill-123\n---");
  });
});

describe("parseJsonArrayField", () => {
  it("returns null for null input", () => {
    const { parsed, error } = parseJsonArrayField(null, "tools");
    expect(parsed).toBeNull();
    expect(error).toBeNull();
  });

  it("returns null for undefined input", () => {
    const { parsed, error } = parseJsonArrayField(undefined, "tools");
    expect(parsed).toBeNull();
    expect(error).toBeNull();
  });

  it("parses a valid JSON array", () => {
    const { parsed, error } = parseJsonArrayField(
      '["Read", "Write"]',
      "tools",
    );
    expect(parsed).toEqual(["Read", "Write"]);
    expect(error).toBeNull();
  });

  it("converts non-string array elements to strings", () => {
    const { parsed, error } = parseJsonArrayField("[1, 2, 3]", "tools");
    expect(parsed).toEqual(["1", "2", "3"]);
    expect(error).toBeNull();
  });

  it("returns error for non-array JSON", () => {
    const { parsed, error } = parseJsonArrayField('{"key": "value"}', "tools");
    expect(parsed).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.code).toBe("JSON_PARSE_FAILED");
  });

  it("returns error for invalid JSON", () => {
    const { parsed, error } = parseJsonArrayField("not json", "tools");
    expect(parsed).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.code).toBe("JSON_PARSE_FAILED");
  });

  it("includes componentId in error when provided", () => {
    const { error } = parseJsonArrayField("bad", "tools", "comp-1");
    expect(error!.componentId).toBe("comp-1");
  });
});

describe("checkHooksField", () => {
  it("returns null when hooks is null", () => {
    expect(checkHooksField(null)).toBeNull();
  });

  it("returns null when hooks is undefined", () => {
    expect(checkHooksField(undefined)).toBeNull();
  });

  it("returns null when hooks is empty string", () => {
    expect(checkHooksField("")).toBeNull();
  });

  it("returns warning when hooks is set", () => {
    const error = checkHooksField("some-hook");
    expect(error).not.toBeNull();
    expect(error!.severity).toBe("warning");
    expect(error!.code).toBe("HOOKS_NOT_SUPPORTED");
  });

  it("includes componentId when provided", () => {
    const error = checkHooksField("hook", "comp-1");
    expect(error!.componentId).toBe("comp-1");
  });
});
