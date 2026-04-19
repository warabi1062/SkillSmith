import { describe, expect, it } from "vitest";
import { buildAgentFileContent } from "../agent-file-builder.server";
import { tool, mcp } from "../../types/skill";

describe("buildAgentFileContent", () => {
  it("name と description を含む frontmatter を生成する", () => {
    const content = buildAgentFileContent({
      name: "sample-agent",
      description: "サンプル説明",
      body: "本文",
    });

    expect(content).toContain("---\n");
    expect(content).toContain("name: sample-agent");
    expect(content).toContain("description: サンプル説明");
  });

  it("model を指定した場合に frontmatter に出力する", () => {
    const content = buildAgentFileContent({
      name: "a",
      description: "d",
      model: "sonnet",
      body: "本文",
    });

    expect(content).toContain("model: sonnet");
  });

  it("model を省略した場合は frontmatter に出力しない", () => {
    const content = buildAgentFileContent({
      name: "a",
      description: "d",
      body: "本文",
    });

    expect(content).not.toContain("model:");
  });

  it("tools を指定した場合に YAML リストで出力する", () => {
    const content = buildAgentFileContent({
      name: "a",
      description: "d",
      tools: [tool("Read"), tool("Write"), mcp("server", "method")],
      body: "本文",
    });

    expect(content).toContain("tools:");
    expect(content).toContain("  - Read");
    expect(content).toContain("  - Write");
    expect(content).toContain("  - mcp__server__method");
  });

  it("tools が空配列の場合は frontmatter に出力しない", () => {
    const content = buildAgentFileContent({
      name: "a",
      description: "d",
      tools: [],
      body: "本文",
    });

    expect(content).not.toContain("tools:");
  });

  it("skills を指定した場合に YAML リストで出力する", () => {
    const content = buildAgentFileContent({
      name: "a",
      description: "d",
      skills: ["skill-a", "skill-b"],
      body: "本文",
    });

    expect(content).toContain("skills:");
    expect(content).toContain("  - skill-a");
    expect(content).toContain("  - skill-b");
  });

  it("skills が空配列の場合は frontmatter に出力しない", () => {
    const content = buildAgentFileContent({
      name: "a",
      description: "d",
      skills: [],
      body: "本文",
    });

    expect(content).not.toContain("skills:");
  });

  it("frontmatter と body の間を空行で区切り末尾に改行を付ける", () => {
    const content = buildAgentFileContent({
      name: "a",
      description: "d",
      body: "本文",
    });

    expect(content).toMatch(/---\n\n本文\n$/);
  });
});
