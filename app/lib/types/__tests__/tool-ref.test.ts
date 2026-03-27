import { describe, it, expect } from "vitest";
import { tool, bash, mcp, serializeToolRef, parseToolRef } from "../skill";
import type { ToolRef } from "../skill";

describe("serializeToolRef", () => {
  it("単純ツールを文字列に変換する", () => {
    expect(serializeToolRef(tool("Read"))).toBe("Read");
  });

  it("パターン付きツールを文字列に変換する", () => {
    expect(serializeToolRef(bash("git *"))).toBe("Bash(git *)");
  });

  it("MCPツールを文字列に変換する", () => {
    expect(serializeToolRef(mcp("plugin_linear_linear", "get_issue"))).toBe(
      "mcp__plugin_linear_linear__get_issue",
    );
  });
});

describe("parseToolRef", () => {
  it("単純ツール文字列をパースする", () => {
    const result = parseToolRef("Read");
    expect(result).toEqual({ type: "tool", name: "Read" });
  });

  it("パターン付きツール文字列をパースする", () => {
    const result = parseToolRef("Bash(git *)");
    expect(result).toEqual({ type: "tool", name: "Bash", pattern: "git *" });
  });

  it("MCPツール文字列をパースする", () => {
    const result = parseToolRef("mcp__plugin_linear_linear__get_issue");
    expect(result).toEqual({
      type: "mcp",
      server: "plugin_linear_linear",
      method: "get_issue",
    });
  });
});

describe("ラウンドトリップ", () => {
  const cases: [string, ToolRef][] = [
    ["単純ツール", tool("Write")],
    ["パターン付きツール", bash("gh *")],
    ["MCPツール", mcp("plugin_linear_linear", "save_issue")],
  ];

  it.each(cases)("%s: serialize → parse で元に戻る", (_label, ref) => {
    const serialized = serializeToolRef(ref);
    const parsed = parseToolRef(serialized);
    expect(parsed).toEqual(ref);
  });
});

describe("ファクトリ関数", () => {
  it("tool() は type: tool のToolRefを返す", () => {
    expect(tool("Glob")).toEqual({ type: "tool", name: "Glob" });
  });

  it("bash() は Bash + pattern のToolRefを返す", () => {
    expect(bash("npm *")).toEqual({ type: "tool", name: "Bash", pattern: "npm *" });
  });

  it("mcp() は type: mcp のToolRefを返す", () => {
    expect(mcp("server", "method")).toEqual({ type: "mcp", server: "server", method: "method" });
  });
});
