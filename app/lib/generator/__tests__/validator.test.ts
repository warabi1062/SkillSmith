import { describe, expect, it } from "vitest";
import {
  validateGeneratedPlugin,
  type ValidatorSkillData,
} from "../validator.server";
import type { GeneratedPlugin } from "../types";

function makePlugin(
  files: { path: string; content: string; skillName?: string }[],
): GeneratedPlugin {
  return {
    pluginName: "test-plugin",
    files,
    validationErrors: [],
  };
}

function makeSkillData(
  overrides: Partial<ValidatorSkillData> = {},
): ValidatorSkillData {
  return {
    name: overrides.name ?? "my-skill",
    skillType: overrides.skillType ?? "WORKER",
    dependencies: overrides.dependencies,
  };
}

describe("validateGeneratedPlugin", () => {
  it("有効なプラグインでエラーが返らないこと", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "skills/my-skill/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("plugin.jsonが不足している場合にエラーを返すこと", () => {
    const plugin = makePlugin([
      { path: "skills/my-skill/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === "DIRECTORY_STRUCTURE_MISMATCH")).toBe(
      true,
    );
  });

  it("スキルがない場合にエラーを返すこと", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
    ]);
    const skills: ValidatorSkillData[] = [];
    const errors = validateGeneratedPlugin(plugin, skills);
    expect(errors.some((e) => e.code === "EMPTY_PLUGIN")).toBe(true);
  });

  it("コンテンツファイルがない場合にエラーを返すこと", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === "EMPTY_PLUGIN")).toBe(true);
  });

  it("重複ファイルパスに対してエラーを返すこと", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "skills/a/SKILL.md", content: "# A" },
      { path: "skills/a/SKILL.md", content: "# A duplicate" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === "DUPLICATE_FILE_PATH")).toBe(true);
  });

  it("SKILL.mdがskills/以外にある場合にwarningを返すこと", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "other/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === "DIRECTORY_STRUCTURE_MISMATCH")).toBe(
      true,
    );
  });

  it("依存ターゲットが同一プラグイン内にない場合にwarningを返すこと", () => {
    const skills: ValidatorSkillData[] = [
      makeSkillData({ name: "my-skill", dependencies: ["external-skill"] }),
    ];
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "skills/my-skill/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin, skills);
    expect(errors.some((e) => e.code === "MISSING_DEPENDENCY_TARGET")).toBe(
      true,
    );
  });

  it("依存ターゲットが同一プラグイン内にある場合にwarningが返らないこと", () => {
    const skills: ValidatorSkillData[] = [
      makeSkillData({ name: "my-skill", dependencies: ["other-skill"] }),
      makeSkillData({ name: "other-skill" }),
    ];
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "skills/my-skill/SKILL.md", content: "# Skill" },
      { path: "skills/other-skill/SKILL.md", content: "# Other" },
    ]);
    const errors = validateGeneratedPlugin(plugin, skills);
    expect(errors.some((e) => e.code === "MISSING_DEPENDENCY_TARGET")).toBe(
      false,
    );
  });
});
