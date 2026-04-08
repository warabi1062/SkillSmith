import { describe, expect, it } from "vitest";
import { generateAgentMd } from "../agent-generator.server";
import { tool } from "../../types/skill";
import type { ToolRef } from "../../types/skill";
import { FILE_PATHS } from "../../types/constants";

function makeAgentComponent(overrides: {
  skillName?: string;
  skillDescription?: string;
  skillInput?: string[];
  skillOutput?: string[];
  description?: string;
  model?: string;
  tools?: ToolRef[];
}) {
  return {
    skillName: overrides.skillName ?? "my-skill",
    agentConfig: {
      model: overrides.model,
      tools: overrides.tools,
      description: overrides.description ?? "テスト用エージェント",
    },
    skillConfig: {
      name: overrides.skillName ?? "my-skill",
      description: overrides.skillDescription ?? "A skill description",
      input: overrides.skillInput,
      output: overrides.skillOutput,
    },
  };
}

describe("generateAgentMd", () => {
  it("SkillConfigからagent名を導出する（{name}-agent形式）", () => {
    const { file, errors } = generateAgentMd(makeAgentComponent({}));
    expect(file).not.toBeNull();
    expect(file!.path).toBe(`${FILE_PATHS.AGENTS_DIR}my-skill-agent.md`);
    expect(file!.content).toContain("name: my-skill-agent");
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("AgentConfigのdescriptionをfrontmatterに出力する", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ description: "Agent専用説明" }),
    );
    expect(file!.content).toContain("description: Agent専用説明");
  });

  it("AgentConfigのdescriptionがSkillConfigのdescriptionより優先される", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ description: "Agent説明", skillDescription: "Skill説明" }),
    );
    expect(file!.content).toContain("description: Agent説明");
  });

  it("skillsフィールドにskillConfig.nameを出力する", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ skillName: "implement" }),
    );
    expect(file!.content).toContain("skills:");
    expect(file!.content).toContain("  - implement");
  });

  it("descriptionが空でも実行セクションが生成される", () => {
    const { file, errors } = generateAgentMd(
      makeAgentComponent({ description: "" }),
    );
    expect(file).not.toBeNull();
    expect(file!.content).toContain("## 実行");
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("modelをfrontmatterに含める", () => {
    const { file } = generateAgentMd(makeAgentComponent({ model: "sonnet" }));
    expect(file!.content).toContain("model: sonnet");
  });

  it("toolsをYAMLリストで出力する", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ tools: [tool("Read"), tool("Grep")] }),
    );
    expect(file!.content).toContain("tools:");
    expect(file!.content).toContain("  - Read");
    expect(file!.content).toContain("  - Grep");
  });

  it("agent mdのfrontmatterにinput/outputを含めない", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ skillInput: ["- task ID"], skillOutput: ["- result"] }),
    );
    expect(file!.content).not.toContain("input:");
    expect(file!.content).not.toContain("output:");
  });

  it("descriptionを本文に含める", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ description: "Agent専用の説明文" }),
    );
    expect(file!.content).toContain("Agent専用の説明文");
  });
});
