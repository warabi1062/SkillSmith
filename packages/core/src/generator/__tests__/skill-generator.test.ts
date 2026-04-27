import { describe, expect, it } from "vitest";
import { generateSkillMd } from "../skill-generator.server";
import { tool } from "../../types/skill";
import { SKILL_TYPES, ERROR_CODES, FILE_PATHS } from "../../types/constants";

function makeSkillComponent(overrides: {
  name?: string;
  description?: string;
  content?: string;
  skillType?: string;
  argumentHint?: string;
  allowedTools?: import("../../types/skill").ToolRef[];
  input?: string[];
  output?: string[];
  model?: import("../../types/skill").SkillModel;
}) {
  return {
    skillName: overrides.name ?? "my-skill",
    skillConfig: {
      name: overrides.name ?? "my-skill",
      description: overrides.description,
      skillType: overrides.skillType ?? SKILL_TYPES.ENTRY_POINT,
      argumentHint: overrides.argumentHint,
      allowedTools: overrides.allowedTools,
      content: overrides.content ?? "# Hello",
      input: overrides.input,
      output: overrides.output,
      model: overrides.model,
    },
  };
}

describe("generateSkillMd", () => {
  it("generates a valid skill markdown with frontmatter", () => {
    const { file, errors } = generateSkillMd(makeSkillComponent({}));
    expect(file).not.toBeNull();
    expect(file!.path).toBe(
      `${FILE_PATHS.SKILLS_DIR}my-skill/${FILE_PATHS.SKILL_MD}`,
    );
    expect(file!.content).toContain("---\nname: my-skill\n---");
    expect(file!.content).toContain("# Hello");
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("includes description in frontmatter when set", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ description: "A test skill" }),
    );
    expect(file!.content).toContain("description: A test skill");
  });

  it("includes argument-hint in frontmatter when set", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ argumentHint: "<file>" }),
    );
    expect(file!.content).toContain("argument-hint:");
  });

  it("includes user-invocable: false for WORKER skillType", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ skillType: SKILL_TYPES.WORKER }),
    );
    expect(file!.content).toContain("user-invocable: false");
  });

  it("includes user-invocable: false for WORKER_WITH_SUB_AGENT skillType", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ skillType: SKILL_TYPES.WORKER_WITH_SUB_AGENT }),
    );
    expect(file!.content).toContain("user-invocable: false");
  });

  it("omits user-invocable for ENTRY_POINT skillType", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ skillType: SKILL_TYPES.ENTRY_POINT }),
    );
    expect(file!.content).not.toContain("user-invocable");
  });

  it("includes allowed-tools as YAML list", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ allowedTools: [tool("Read"), tool("Write")] }),
    );
    expect(file!.content).toContain("allowed-tools:");
    expect(file!.content).toContain("  - Read");
    expect(file!.content).toContain("  - Write");
  });

  it("returns error for invalid skill name", () => {
    const { file, errors } = generateSkillMd(
      makeSkillComponent({ name: "INVALID_NAME" }),
    );
    expect(file).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe(ERROR_CODES.INVALID_SKILL_NAME);
  });

  it("returns error when content is empty", () => {
    const { file, errors } = generateSkillMd(
      makeSkillComponent({ content: "" }),
    );
    expect(file).toBeNull();
    expect(errors.some((e) => e.code === ERROR_CODES.EMPTY_CONTENT)).toBe(true);
  });

  it("SKILL.mdのfrontmatterにinput/outputを含めない", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ input: ["task ID"], output: ["result"] }),
    );
    expect(file!.content).not.toContain("input:");
    expect(file!.content).not.toContain("output:");
  });

  it("model 指定時に frontmatter に model を出力する", () => {
    const { file } = generateSkillMd(makeSkillComponent({ model: "sonnet" }));
    expect(file!.content).toContain("model: sonnet");
  });

  it("model 未指定時は frontmatter に model を含めない", () => {
    const { file } = generateSkillMd(makeSkillComponent({}));
    expect(file!.content).not.toContain("model:");
  });

  it.each([
    "sonnet",
    "opus",
    "haiku",
    "inherit",
  ] as const)("model に %s を指定した場合 frontmatter に出力される", (model) => {
    const { file } = generateSkillMd(makeSkillComponent({ model }));
    expect(file!.content).toContain(`model: ${model}`);
  });
});
