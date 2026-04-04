import { describe, expect, it } from "vitest";
import {
  generateAgentMd,
  generateAgentTeamMd,
} from "../agent-generator.server";
import { tool } from "../../types/skill";
import type { ToolRef } from "../../types/skill";
import { ERROR_CODES, FILE_PATHS } from "../../types/constants";

function makeAgentComponent(overrides: {
  skillName?: string;
  skillDescription?: string;
  skillInput?: string[];
  skillOutput?: string[];
  content?: string;
  model?: string;
  tools?: ToolRef[];
}) {
  return {
    skillName: overrides.skillName ?? "my-skill",
    agentConfig: {
      model: overrides.model,
      tools: overrides.tools,
      content: overrides.content ?? "# Agent body",
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
    expect(errors.some((e) => e.code === ERROR_CODES.EMPTY_CONTENT)).toBe(true);
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

  it("contentを本文に含める", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ content: "# Agent body" }),
    );
    expect(file!.content).toContain("# Agent body");
  });
});

describe("generateAgentTeamMd", () => {
  it("複数skill名をskills:に列挙したagentファイルを生成する", () => {
    const { file, errors } = generateAgentTeamMd({
      skillName: "review-team",
      skillConfig: {
        name: "review-team",
        description: "A review team",
        input: ["PR URL"],
        output: ["review result"],
      },
      memberSkillNames: ["code-review", "security-check", "style-lint"],
    });

    expect(file).not.toBeNull();
    expect(file!.path).toBe(`${FILE_PATHS.AGENTS_DIR}review-team-agent.md`);
    expect(file!.content).toContain("name: review-team-agent");
    expect(file!.content).toContain("description: A review team");
    expect(file!.content).toContain("skills:");
    expect(file!.content).toContain("  - code-review");
    expect(file!.content).toContain("  - security-check");
    expect(file!.content).toContain("  - style-lint");
    expect(file!.content).toContain("input:");
    expect(file!.content).toContain("output:");
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("メンバーがいない場合にwarningを返す", () => {
    const { file, errors } = generateAgentTeamMd({
      skillName: "empty-team",
      skillConfig: {
        name: "empty-team",
        description: undefined,
        input: undefined,
        output: undefined,
      },
      memberSkillNames: [],
    });

    expect(file).not.toBeNull();
    expect(errors.some((e) => e.code === ERROR_CODES.NO_TEAM_MEMBERS)).toBe(true);
  });

  it("agent名は{name}-agent形式になる", () => {
    const { file } = generateAgentTeamMd({
      skillName: "deploy-team",
      skillConfig: {
        name: "deploy-team",
        description: "Deploy team",
        input: undefined,
        output: undefined,
      },
      memberSkillNames: ["deploy-worker"],
    });

    expect(file!.path).toBe(`${FILE_PATHS.AGENTS_DIR}deploy-team-agent.md`);
    expect(file!.content).toContain("name: deploy-team-agent");
  });
});
