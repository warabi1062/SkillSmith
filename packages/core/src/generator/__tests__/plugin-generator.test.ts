import { describe, expect, it } from "vitest";
import {
  generatePlugin,
  buildSkillMetas,
  generateSkillComponent,
} from "../plugin-generator.server";
import type {
  LoadedPluginDefinition,
  LoadedSkillUnion,
} from "../../types/loaded";
import { SKILL_TYPES, FILE_PATHS } from "../../types/constants";
import { tool } from "../../types/skill";

// テスト用のスキルを作成するヘルパー
function makeEntryPointSkill(
  overrides?: Partial<LoadedSkillUnion>,
): LoadedSkillUnion {
  return {
    name: "my-skill",
    files: [],
    skillType: SKILL_TYPES.ENTRY_POINT,
    steps: [
      {
        inline: "タスク実行",
        steps: [{ id: "1", title: "実行", body: "実行する" }],
      },
    ],
    ...overrides,
  } as LoadedSkillUnion;
}

function makeWorkerWithSubAgentSkill(
  overrides?: Partial<LoadedSkillUnion>,
): LoadedSkillUnion {
  return {
    name: "my-worker",
    files: [],
    skillType: SKILL_TYPES.WORKER_WITH_SUB_AGENT,
    input: ["task ID"],
    output: ["result file"],
    workerSteps: [{ id: "1", title: "実行", body: "実行する" }],
    agentConfig: {
      tools: [tool("Read")],
      description: "テスト用エージェント",
    },
    ...overrides,
  } as LoadedSkillUnion;
}

function makeWorkerWithAgentTeamSkill(
  overrides?: Partial<LoadedSkillUnion>,
): LoadedSkillUnion {
  return {
    name: "review-team",
    files: [],
    skillType: SKILL_TYPES.WORKER_WITH_AGENT_TEAM,
    teamPrefix: "review",
    teammates: [
      {
        name: "drafter",
        role: "草稿作成",
        model: "haiku",
        tools: [tool("Read"), tool("Write")],
        steps: [{ id: "1", title: "草稿", body: "草稿を書く" }],
        sortOrder: 1,
      },
      {
        name: "reviewer",
        role: "レビュー",
        steps: [{ id: "1", title: "レビュー", body: "レビューする" }],
        sortOrder: 2,
      },
    ],
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
      makeEntryPointSkill({
        name: "with-io",
        input: ["task ID"],
        output: ["result"],
      }),
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
    const skillMd = result.files.find((f) =>
      f.path.endsWith(FILE_PATHS.SKILL_MD),
    );
    expect(skillMd).toBeDefined();
    expect(skillMd!.content).toContain("## 作業詳細");
    expect(result.errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("WORKER_WITH_SUB_AGENTスキルでSKILL.mdとagent.mdの両方を生成する", () => {
    // Arrange
    const skill = makeWorkerWithSubAgentSkill();
    const metas = new Map();

    // Act
    const result = generateSkillComponent(skill, metas);

    // Assert
    const skillMd = result.files.find((f) =>
      f.path.endsWith(FILE_PATHS.SKILL_MD),
    );
    const agentMd = result.files.find((f) => f.path.includes("agents/"));
    expect(skillMd).toBeDefined();
    expect(agentMd).toBeDefined();
  });

  it("WORKER_WITH_AGENT_TEAMスキルでSKILL.mdとteammate数分のagent.mdを生成する", () => {
    // Arrange
    const skill = makeWorkerWithAgentTeamSkill();
    const metas = new Map();

    // Act
    const result = generateSkillComponent(skill, metas);

    // Assert
    const skillMd = result.files.find((f) =>
      f.path.endsWith(FILE_PATHS.SKILL_MD),
    );
    expect(skillMd).toBeDefined();

    const agentFiles = result.files.filter((f) =>
      f.path.startsWith(FILE_PATHS.AGENTS_DIR),
    );
    expect(agentFiles.map((f) => f.path).toSorted()).toEqual([
      `${FILE_PATHS.AGENTS_DIR}review-team-drafter.md`,
      `${FILE_PATHS.AGENTS_DIR}review-team-reviewer.md`,
    ]);

    // drafter agent に model / tools が出力されている
    const drafterMd = agentFiles.find((f) => f.path.includes("drafter"));
    expect(drafterMd!.content).toContain("name: review-team-drafter");
    expect(drafterMd!.content).toContain("model: haiku");
    expect(drafterMd!.content).toContain("  - Read");

    expect(result.errors.filter((e) => e.severity === "error")).toHaveLength(0);
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
    const pluginJson = plugin.files.find(
      (f) => f.path === FILE_PATHS.PLUGIN_JSON,
    );
    expect(pluginJson).toBeDefined();
    expect(plugin.files.length).toBeGreaterThan(1);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("my-skill");
  });

  it("複数スキルを持つプラグインで全スキルのファイルを生成する", () => {
    // Arrange
    const pluginDef = makePluginDef([
      makeEntryPointSkill({ name: "skill-a" }),
      makeEntryPointSkill({ name: "skill-b" }),
    ]);

    // Act
    const { plugin, skills } = generatePlugin(pluginDef);

    // Assert
    const skillFiles = plugin.files.filter((f) =>
      f.path.endsWith(FILE_PATHS.SKILL_MD),
    );
    expect(skillFiles).toHaveLength(2);
    expect(skills).toHaveLength(2);
  });

  it("スキルのバリデーションエラーをプラグインのvalidationErrorsに集約する", () => {
    // Arrange
    const pluginDef = makePluginDef([makeEntryPointSkill({ name: "INVALID" })]);

    // Act
    const { plugin } = generatePlugin(pluginDef);

    // Assert
    expect(plugin.validationErrors.length).toBeGreaterThan(0);
  });
});
