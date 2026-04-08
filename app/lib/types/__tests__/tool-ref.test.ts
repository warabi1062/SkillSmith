import { describe, it, expect } from "vitest";
import { tool, bash, mcp, serializeToolRef } from "../skill";

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

describe("ファクトリ関数", () => {
  it("tool() は type: tool のToolRefを返す", () => {
    expect(tool("Glob")).toEqual({ type: "tool", name: "Glob" });
  });

  it("bash() は Bash + pattern のToolRefを返す", () => {
    expect(bash("npm *")).toEqual({
      type: "tool",
      name: "Bash",
      pattern: "npm *",
    });
  });

  it("mcp() は type: mcp のToolRefを返す", () => {
    expect(mcp("server", "method")).toEqual({
      type: "mcp",
      server: "server",
      method: "method",
    });
  });
});
