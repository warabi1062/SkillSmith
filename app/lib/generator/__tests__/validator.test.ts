import { describe, expect, it } from "vitest";
import {
  validateGeneratedPlugin,
  type ValidatorComponentData,
} from "../validator.server";
import type { GeneratedPlugin } from "../types";

function makePlugin(
  files: { path: string; content: string; componentId?: string }[],
): GeneratedPlugin {
  return {
    pluginName: "test-plugin",
    files,
    validationErrors: [],
  };
}

function makeComponent(overrides: Partial<ValidatorComponentData> = {}): ValidatorComponentData {
  return {
    id: overrides.id ?? "comp-1",
    type: "SKILL",
    skillConfig: overrides.skillConfig ?? { name: "my-skill", skillType: "WORKER" },
    dependenciesFrom: overrides.dependenciesFrom ?? [],
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

  it("コンポーネントがない場合にエラーを返すこと", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
    ]);
    const components: ValidatorComponentData[] = [];
    const errors = validateGeneratedPlugin(plugin, components);
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
    const components: ValidatorComponentData[] = [
      makeComponent({
        id: "comp-1",
        dependenciesFrom: [
          {
            target: {
              id: "comp-external",
              type: "SKILL",
              skillConfig: { name: "ext", skillType: "WORKER" },
            },
          },
        ],
      }),
    ];
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "skills/my-skill/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin, components);
    expect(errors.some((e) => e.code === "MISSING_DEPENDENCY_TARGET")).toBe(
      true,
    );
  });
});
