import { describe, expect, it } from "vitest";
import { generateAgentMd } from "../agent-generator.server";

function makeAgentComponent(overrides: {
  skillName?: string;
  skillDescription?: string | null;
  skillInput?: string;
  skillOutput?: string;
  content?: string;
  model?: string | null;
  tools?: string | null;
  disallowedTools?: string | null;
  permissionMode?: string | null;
  hooks?: string | null;
  memory?: string | null;
}) {
  return {
    id: "comp-1",
    agentConfig: {
      id: "ac-1",
      skillConfigId: "sc-1",
      model: overrides.model ?? null,
      tools: overrides.tools ?? null,
      disallowedTools: overrides.disallowedTools ?? null,
      permissionMode: overrides.permissionMode ?? null,
      hooks: overrides.hooks ?? null,
      memory: overrides.memory ?? null,
      content: overrides.content ?? "# Agent body",
    },
    skillConfig: {
      name: overrides.skillName ?? "my-skill",
      description: overrides.skillDescription ?? "A skill description",
      input: overrides.skillInput ?? "",
      output: overrides.skillOutput ?? "",
    },
  };
}

describe("generateAgentMd", () => {
  it("SkillConfigからagent名を導出する（{name}-agent形式）", () => {
    const { file, errors } = generateAgentMd(makeAgentComponent({}));
    expect(file).not.toBeNull();
    expect(file!.path).toBe("agents/my-skill-agent.md");
    expect(file!.content).toContain("name: my-skill-agent");
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("SkillConfigのdescriptionをfrontmatterに出力する", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ skillDescription: "Skill desc" }),
    );
    expect(file!.content).toContain("description: Skill desc");
  });

  it("skillsフィールドにskillConfig.nameを出力する", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ skillName: "implement" }),
    );
    expect(file!.content).toContain("skills:");
    expect(file!.content).toContain("  - implement");
  });

  it("contentが空の場合はエラーを返す", () => {
    const { file, errors } = generateAgentMd(
      makeAgentComponent({ content: "" }),
    );
    expect(file).toBeNull();
    expect(errors.some((e) => e.code === "EMPTY_CONTENT")).toBe(true);
  });

  it("modelをfrontmatterに含める", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ model: "sonnet" }),
    );
    expect(file!.content).toContain("model: sonnet");
  });

  it("toolsをYAMLリストで出力する", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ tools: '["Read", "Grep"]' }),
    );
    expect(file!.content).toContain("tools:");
    expect(file!.content).toContain("  - Read");
    expect(file!.content).toContain("  - Grep");
  });

  it("permissionModeをfrontmatterに含める", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ permissionMode: "bypassPermissions" }),
    );
    expect(file!.content).toContain("permissionMode: bypassPermissions");
  });

  it("skillConfigのinputをfrontmatterに含める", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ skillInput: "- task ID" }),
    );
    expect(file!.content).toContain("input:");
  });

  it("skillConfigのoutputをfrontmatterに含める", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ skillOutput: "- result" }),
    );
    expect(file!.content).toContain("output:");
  });

  it("input/outputが空の場合はfrontmatterに含めない", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ skillInput: "", skillOutput: "" }),
    );
    expect(file!.content).not.toContain("input:");
    expect(file!.content).not.toContain("output:");
  });

  it("hooksフィールド設定時にwarningを返す", () => {
    const { errors } = generateAgentMd(
      makeAgentComponent({ hooks: "some-hook" }),
    );
    expect(errors.some((e) => e.code === "HOOKS_NOT_SUPPORTED")).toBe(true);
  });

  it("contentを本文に含める", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ content: "# Agent body" }),
    );
    expect(file!.content).toContain("# Agent body");
  });
});
