import { describe, expect, it } from "vitest";
import { generateSkillMd } from "../skill-generator.server";

function makeSkillComponent(overrides: {
  name?: string;
  description?: string | null;
  content?: string;
  skillType?: string;
  argumentHint?: string | null;
  disableModelInvocation?: boolean;
  allowedTools?: string | null;
  input?: string;
  output?: string;
}) {
  return {
    id: "comp-1",
    skillConfig: {
      id: "sc-1",
      componentId: "comp-1",
      name: overrides.name ?? "my-skill",
      description: overrides.description ?? null,
      skillType: overrides.skillType ?? "ENTRY_POINT",
      argumentHint: overrides.argumentHint ?? null,
      disableModelInvocation: overrides.disableModelInvocation ?? false,
      allowedTools: overrides.allowedTools ?? null,
      content: overrides.content ?? "# Hello",
      input: overrides.input ?? "",
      output: overrides.output ?? "",
    },
  };
}

describe("generateSkillMd", () => {
  it("generates a valid skill markdown with frontmatter", () => {
    const { file, errors } = generateSkillMd(makeSkillComponent({}));
    expect(file).not.toBeNull();
    expect(file!.path).toBe("skills/my-skill/SKILL.md");
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

  it("includes disable-model-invocation when true", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ disableModelInvocation: true }),
    );
    expect(file!.content).toContain("disable-model-invocation: true");
  });

  it("omits disable-model-invocation when false", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ disableModelInvocation: false }),
    );
    expect(file!.content).not.toContain("disable-model-invocation");
  });

  it("includes user-invocable: false for WORKER skillType", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ skillType: "WORKER" }),
    );
    expect(file!.content).toContain("user-invocable: false");
  });

  it("includes user-invocable: false for WORKER_WITH_SUB_AGENT skillType", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ skillType: "WORKER_WITH_SUB_AGENT" }),
    );
    expect(file!.content).toContain("user-invocable: false");
  });

  it("omits user-invocable for ENTRY_POINT skillType", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ skillType: "ENTRY_POINT" }),
    );
    expect(file!.content).not.toContain("user-invocable");
  });

  it("includes allowed-tools as YAML list", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ allowedTools: '["Read", "Write"]' }),
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
    expect(errors[0].code).toBe("INVALID_SKILL_NAME");
  });

  it("returns error when content is empty", () => {
    const { file, errors } = generateSkillMd(
      makeSkillComponent({ content: "" }),
    );
    expect(file).toBeNull();
    expect(errors.some((e) => e.code === "EMPTY_CONTENT")).toBe(true);
  });

  it("includes input in frontmatter when set", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ input: "- task ID\n- file path" }),
    );
    expect(file!.content).toContain("input:");
  });

  it("includes output in frontmatter when set", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ output: "- result path" }),
    );
    expect(file!.content).toContain("output:");
  });

  it("omits input/output when empty", () => {
    const { file } = generateSkillMd(
      makeSkillComponent({ input: "", output: "" }),
    );
    expect(file!.content).not.toContain("input:");
    expect(file!.content).not.toContain("output:");
  });

  it("returns error for invalid allowed-tools JSON", () => {
    const { errors } = generateSkillMd(
      makeSkillComponent({ allowedTools: "not-json" }),
    );
    expect(errors.some((e) => e.code === "JSON_PARSE_FAILED")).toBe(true);
  });
});
