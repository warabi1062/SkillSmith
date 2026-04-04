import { describe, expect, it } from "vitest";
import {
  validateGeneratedPlugin,
  type ValidatorSkillData,
} from "../validator.server";
import type { GeneratedPlugin } from "../types";
import { SKILL_TYPES, ERROR_CODES, FILE_PATHS } from "../../types/constants";

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
    skillType: overrides.skillType ?? SKILL_TYPES.WORKER,
    dependencies: overrides.dependencies,
  };
}

describe("validateGeneratedPlugin", () => {
  it("有効なプラグインでエラーが返らないこと", () => {
    const plugin = makePlugin([
      { path: FILE_PATHS.PLUGIN_JSON, content: "{}" },
      { path: `${FILE_PATHS.SKILLS_DIR}my-skill/${FILE_PATHS.SKILL_MD}`, content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("plugin.jsonが不足している場合にエラーを返すこと", () => {
    const plugin = makePlugin([
      { path: `${FILE_PATHS.SKILLS_DIR}my-skill/${FILE_PATHS.SKILL_MD}`, content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === ERROR_CODES.DIRECTORY_STRUCTURE_MISMATCH)).toBe(
      true,
    );
  });

  it("スキルがない場合にエラーを返すこと", () => {
    const plugin = makePlugin([
      { path: FILE_PATHS.PLUGIN_JSON, content: "{}" },
    ]);
    const skills: ValidatorSkillData[] = [];
    const errors = validateGeneratedPlugin(plugin, skills);
    expect(errors.some((e) => e.code === ERROR_CODES.EMPTY_PLUGIN)).toBe(true);
  });

  it("コンテンツファイルがない場合にエラーを返すこと", () => {
    const plugin = makePlugin([
      { path: FILE_PATHS.PLUGIN_JSON, content: "{}" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === ERROR_CODES.EMPTY_PLUGIN)).toBe(true);
  });

  it("重複ファイルパスに対してエラーを返すこと", () => {
    const plugin = makePlugin([
      { path: FILE_PATHS.PLUGIN_JSON, content: "{}" },
      { path: `${FILE_PATHS.SKILLS_DIR}a/${FILE_PATHS.SKILL_MD}`, content: "# A" },
      { path: `${FILE_PATHS.SKILLS_DIR}a/${FILE_PATHS.SKILL_MD}`, content: "# A duplicate" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === ERROR_CODES.DUPLICATE_FILE_PATH)).toBe(true);
  });

  it("SKILL.mdがskills/以外にある場合にwarningを返すこと", () => {
    const plugin = makePlugin([
      { path: FILE_PATHS.PLUGIN_JSON, content: "{}" },
      { path: `other/${FILE_PATHS.SKILL_MD}`, content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === ERROR_CODES.DIRECTORY_STRUCTURE_MISMATCH)).toBe(
      true,
    );
  });

  it("依存ターゲットが同一プラグイン内にない場合にwarningを返すこと", () => {
    const skills: ValidatorSkillData[] = [
      makeSkillData({ name: "my-skill", dependencies: ["external-skill"] }),
    ];
    const plugin = makePlugin([
      { path: FILE_PATHS.PLUGIN_JSON, content: "{}" },
      { path: `${FILE_PATHS.SKILLS_DIR}my-skill/${FILE_PATHS.SKILL_MD}`, content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin, skills);
    expect(errors.some((e) => e.code === ERROR_CODES.MISSING_DEPENDENCY_TARGET)).toBe(
      true,
    );
  });

  it("依存ターゲットが同一プラグイン内にある場合にwarningが返らないこと", () => {
    const skills: ValidatorSkillData[] = [
      makeSkillData({ name: "my-skill", dependencies: ["other-skill"] }),
      makeSkillData({ name: "other-skill" }),
    ];
    const plugin = makePlugin([
      { path: FILE_PATHS.PLUGIN_JSON, content: "{}" },
      { path: `${FILE_PATHS.SKILLS_DIR}my-skill/${FILE_PATHS.SKILL_MD}`, content: "# Skill" },
      { path: `${FILE_PATHS.SKILLS_DIR}other-skill/${FILE_PATHS.SKILL_MD}`, content: "# Other" },
    ]);
    const errors = validateGeneratedPlugin(plugin, skills);
    expect(errors.some((e) => e.code === ERROR_CODES.MISSING_DEPENDENCY_TARGET)).toBe(
      false,
    );
  });
});
