import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { loadPluginDefinition } from "../loader.server";
import { SKILL_TYPES } from "../../types/constants";

let tmpDir: string;

// テスト用の一時ディレクトリにプラグイン構造を作成するヘルパー
async function createPluginStructure(options: {
  pluginTs: string;
  skills?: Record<string, { skillTs: string; files?: Record<string, string> }>;
}) {
  await fs.writeFile(path.join(tmpDir, "plugin.ts"), options.pluginTs);

  if (options.skills) {
    for (const [skillName, skillData] of Object.entries(options.skills)) {
      const skillDir = path.join(tmpDir, "skills", skillName);
      await fs.mkdir(skillDir, { recursive: true });
      await fs.writeFile(path.join(skillDir, "skill.ts"), skillData.skillTs);

      if (skillData.files) {
        for (const [filename, content] of Object.entries(skillData.files)) {
          await fs.writeFile(path.join(skillDir, filename), content);
        }
      }
    }
  }
}

describe("loadPluginDefinition", () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "skillsmith-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("plugin.ts + skills を正しく読み込むこと", async () => {
    await createPluginStructure({
      pluginTs: `
        // Skill インスタンスとして dependencies に渡す（ローダーが name を取り出して string[] に変換する）
        const workerA = {
          skillType: "WORKER",
          name: "worker-a",
          content: "# Worker A",
        };
        const plugin = {
          name: "test-plugin",
          description: "テストプラグイン",
          skills: [
            {
              skillType: "ENTRY_POINT",
              name: "greet",
              content: "# Greet",
              description: "挨拶スキル",
              input: "名前",
              output: "メッセージ",
              dependencies: [workerA],
            },
            workerA,
          ],
        };
        export default plugin;
      `,
    });

    const result = await loadPluginDefinition(tmpDir);

    expect(result.name).toBe("test-plugin");
    expect(result.description).toBe("テストプラグイン");
    expect(result.skills).toHaveLength(2);

    const greet = result.skills.find((s) => s.name === "greet");
    expect(greet).toBeDefined();
    expect(greet!.skillType).toBe(SKILL_TYPES.ENTRY_POINT);
    expect(greet!.description).toBe("挨拶スキル");
    // ローダーが Skill[] から string[] に変換していることを検証
    expect(greet!.dependencies).toEqual(["worker-a"]);

    const worker = result.skills.find((s) => s.name === "worker-a");
    expect(worker).toBeDefined();
    expect(worker!.skillType).toBe(SKILL_TYPES.WORKER);
  });

  it("SupportFile の content を読み込むこと", async () => {
    await createPluginStructure({
      pluginTs: `
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "WORKER",
              name: "my-skill",
              content: "# My Skill",
              files: [
                { filename: "template.md" },
              ],
            },
          ],

        };
        export default plugin;
      `,
      skills: {
        "my-skill": {
          skillTs: "",
          files: {
            "template.md": "# Template Content\n\nHello World",
          },
        },
      },
    });

    const result = await loadPluginDefinition(tmpDir);

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].files).toHaveLength(1);
    expect(result.skills[0].files[0].filename).toBe("template.md");
    expect(result.skills[0].files[0].content).toBe(
      "# Template Content\n\nHello World",
    );
  });

  it("plugin.ts が存在しないディレクトリでエラーになること", async () => {
    const nonExistentDir = path.join(tmpDir, "non-existent");
    await fs.mkdir(nonExistentDir, { recursive: true });

    await expect(loadPluginDefinition(nonExistentDir)).rejects.toThrow(
      "plugin.ts が見つかりません",
    );
  });

  it("SupportFile が見つからない場合にエラーになること", async () => {
    await createPluginStructure({
      pluginTs: `
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "WORKER",
              name: "my-skill",
              content: "# My Skill",
              files: [
                { role: "TEMPLATE", filename: "missing.md" },
              ],
            },
          ],

        };
        export default plugin;
      `,
    });

    await expect(loadPluginDefinition(tmpDir)).rejects.toThrow(
      "サポートファイルが見つかりません",
    );
  });

  it("WORKER_WITH_SUB_AGENT スキルの agentConfig を正しく読み込むこと", async () => {
    await createPluginStructure({
      pluginTs: `
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "WORKER_WITH_SUB_AGENT",
              name: "agent-skill",
              workerSteps: [{ id: "1", title: "テスト手順" }],
              agentConfig: {
                model: "sonnet",
                tools: ["Read", "Write"],
                description: "テスト用エージェント",
              },
            },
          ],

        };
        export default plugin;
      `,
    });

    const result = await loadPluginDefinition(tmpDir);
    const skill = result.skills[0];

    expect(skill.skillType).toBe(SKILL_TYPES.WORKER_WITH_SUB_AGENT);
    expect("agentConfig" in skill).toBe(true);
    if ("agentConfig" in skill) {
      expect(skill.agentConfig.model).toBe("sonnet");
      expect(skill.agentConfig.tools).toEqual(["Read", "Write"]);
      expect(skill.agentConfig.description).toBe("テスト用エージェント");
    }
  });

  it("steps を LoadedStep[] に変換し dependencies を自動導出すること", async () => {
    await createPluginStructure({
      pluginTs: `
        const workerA = {
          skillType: "WORKER",
          name: "worker-a",
          content: "# Worker A",
        };
        const workerB = {
          skillType: "WORKER",
          name: "worker-b",
          content: "# Worker B",
        };
        const workerC = {
          skillType: "WORKER",
          name: "worker-c",
          content: "# Worker C",
        };
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "ENTRY_POINT",
              name: "orchestrator",
              content: "# Orch",
              steps: [
                {
                  decisionPoint: "入力判定",
                  cases: {
                    "モードA": [workerA],
                    "モードB": [],
                  },
                },
                workerB,
                workerC,
              ],
            },
            workerA,
            workerB,
            workerC,
          ],
        };
        export default plugin;
      `,
    });

    const result = await loadPluginDefinition(tmpDir);
    const orch = result.skills.find((s) => s.name === "orchestrator");
    expect(orch).toBeDefined();

    // steps が LoadedStep[] に変換されていること
    expect(orch!.steps).toBeDefined();
    expect(orch!.steps).toHaveLength(3);
    // 最初の要素は LoadedBranch
    const branch = orch!.steps![0];
    expect(typeof branch).toBe("object");
    expect("decisionPoint" in (branch as object)).toBe(true);

    // dependencies が steps から自動導出されていること
    expect(orch!.dependencies).toEqual(["worker-a", "worker-b", "worker-c"]);
  });

  it("WORKER_WITH_AGENT_TEAM スキルの teammates を正しく読み込むこと", async () => {
    await createPluginStructure({
      pluginTs: `
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "WORKER_WITH_AGENT_TEAM",
              name: "team-skill",
              teamPrefix: "test",
              teammates: [
                { name: "member-a", role: "役割A", steps: [{ id: "S1", title: "ステップ1", body: "本文" }], sortOrder: 0 },
                { name: "member-b", role: "役割B", steps: [{ id: "S1", title: "ステップ1", body: "本文" }], sortOrder: 1 },
              ],
            },
          ],
        };
        export default plugin;
      `,
    });

    const result = await loadPluginDefinition(tmpDir);
    const skill = result.skills[0];

    expect(skill.skillType).toBe(SKILL_TYPES.WORKER_WITH_AGENT_TEAM);
    expect("teammates" in skill).toBe(true);
    if ("teammates" in skill) {
      expect(skill.teammates).toHaveLength(2);
      expect(skill.teammates![0].name).toBe("member-a");
      expect(skill.teammates![1].name).toBe("member-b");
    }
  });
});
