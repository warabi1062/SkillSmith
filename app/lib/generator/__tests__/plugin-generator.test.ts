import { describe, expect, it } from "vitest";
import { generatePlugin, buildSkillMetas, generateSkillComponent } from "../plugin-generator.server";
import type { LoadedPluginDefinition, LoadedSkillUnion } from "../../types/loaded";
import { SKILL_TYPES, FILE_PATHS } from "../../types/constants";
import { tool } from "../../types/skill";

// テスト用のスキルを作成するヘルパー
function makeEntryPointSkill(overrides?: Partial<LoadedSkillUnion>): LoadedSkillUnion {
  return {
    name: "my-skill",
    content: "# My Skill",
    files: [],
    skillType: SKILL_TYPES.ENTRY_POINT,
    ...overrides,
  } as LoadedSkillUnion;
}

function makeWorkerWithSubAgentSkill(overrides?: Partial<LoadedSkillUnion>): LoadedSkillUnion {
  return {
    name: "my-worker",
    content: "# Worker",
    files: [],
    skillType: SKILL_TYPES.WORKER_WITH_SUB_AGENT,
    input: ["task ID"],
    output: ["result file"],
    agentConfig: {
      tools: [tool("Read")],
      content: "Agent content",
    },
    ...overrides,
  } as LoadedSkillUnion;
}

function makePluginDef(skills: LoadedSkillUnion[]): LoadedPluginDefinition {
  return {
    name: "test-plugin",
    description: "A test plugin",
    skills,
  };
}

describe("buildSkillMetas", () => {
  it("input/outputを持つスキルのメタ情報をマップに格納する", () => {
    // Arrange
    const skills: LoadedSkillUnion[] = [
      makeEntryPointSkill({ name: "orchestrator" }),
      makeEntryPointSkill({ name: "with-io", input: ["task ID"], output: ["result"] }),
    ];

    // Act
    const metas = buildSkillMetas(skills);

    // Assert
    expect(metas.has("orchestrator")).toBe(false);
    expect(metas.has("with-io")).toBe(true);
    expect(metas.get("with-io")).toEqual({
      input: ["task ID"],
      output: ["result"],
      hasAgent: false,
    });
  });

  it("WORKER_WITH_SUB_AGENTスキルにhasAgent: trueを設定する", () => {
    // Arrange
    const skills: LoadedSkillUnion[] = [
      makeWorkerWithSubAgentSkill({ name: "impl" }),
    ];

    // Act
    const metas = buildSkillMetas(skills);

    // Assert
    expect(metas.get("impl")?.hasAgent).toBe(true);
  });

  it("空のスキル配列で空のマップを返す", () => {
    // Arrange & Act
    const metas = buildSkillMetas([]);

    // Assert
    expect(metas.size).toBe(0);
  });
});

describe("generateSkillComponent", () => {
  it("EntryPointスキルでSKILL.mdファイルを生成する", () => {
    // Arrange
    const skill = makeEntryPointSkill();
    const metas = new Map();

    // Act
    const result = generateSkillComponent(skill, metas);

    // Assert
    expect(result.files.length).toBeGreaterThanOrEqual(1);
    const skillMd = result.files.find((f) => f.path.endsWith(FILE_PATHS.SKILL_MD));
    expect(skillMd).toBeDefined();
    expect(skillMd!.content).toContain("# My Skill");
    expect(result.errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("WORKER_WITH_SUB_AGENTスキルでSKILL.mdとagent.mdの両方を生成する", () => {
    // Arrange
    const skill = makeWorkerWithSubAgentSkill();
    const metas = new Map();

    // Act
    const result = generateSkillComponent(skill, metas);

    // Assert
    const skillMd = result.files.find((f) => f.path.endsWith(FILE_PATHS.SKILL_MD));
    const agentMd = result.files.find((f) => f.path.includes("agents/"));
    expect(skillMd).toBeDefined();
    expect(agentMd).toBeDefined();
  });

  it("無効なスキル名でエラーを返しファイルを生成しない", () => {
    // Arrange
    const skill = makeEntryPointSkill({ name: "INVALID_NAME" });
    const metas = new Map();

    // Act
    const result = generateSkillComponent(skill, metas);

    // Assert
    expect(result.files).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("generatePlugin", () => {
  it("plugin.jsonとスキルファイルを含むプラグインを生成する", () => {
    // Arrange
    const pluginDef = makePluginDef([makeEntryPointSkill()]);

    // Act
    const { plugin, skills } = generatePlugin(pluginDef);

    // Assert
    const pluginJson = plugin.files.find((f) => f.path === FILE_PATHS.PLUGIN_JSON);
    expect(pluginJson).toBeDefined();
    expect(plugin.files.length).toBeGreaterThan(1);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("my-skill");
  });

  it("複数スキルを持つプラグインで全スキルのファイルを生成する", () => {
    // Arrange
    const pluginDef = makePluginDef([
      makeEntryPointSkill({ name: "skill-a" }),
      makeEntryPointSkill({ name: "skill-b", content: "# B" }),
    ]);

    // Act
    const { plugin, skills } = generatePlugin(pluginDef);

    // Assert
    const skillFiles = plugin.files.filter((f) => f.path.endsWith(FILE_PATHS.SKILL_MD));
    expect(skillFiles).toHaveLength(2);
    expect(skills).toHaveLength(2);
  });

  it("スキルのバリデーションエラーをプラグインのvalidationErrorsに集約する", () => {
    // Arrange
    const pluginDef = makePluginDef([
      makeEntryPointSkill({ name: "INVALID" }),
    ]);

    // Act
    const { plugin } = generatePlugin(pluginDef);

    // Assert
    expect(plugin.validationErrors.length).toBeGreaterThan(0);
  });
});
