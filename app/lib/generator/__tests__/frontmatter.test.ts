import { describe, expect, it } from "vitest";
import { serializeFrontmatter } from "../frontmatter.server";

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
    expect(result).toBe("---\ntools:\n  - Read\n  - Write\n---");
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
