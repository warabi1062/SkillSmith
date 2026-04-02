import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { loadPluginDefinition } from "../loader.server";

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
    expect(greet!.skillType).toBe("ENTRY_POINT");
    expect(greet!.content).toBe("# Greet");
    expect(greet!.description).toBe("挨拶スキル");
    // ローダーが Skill[] から string[] に変換していることを検証
    expect(greet!.dependencies).toEqual(["worker-a"]);

    const worker = result.skills.find((s) => s.name === "worker-a");
    expect(worker).toBeDefined();
    expect(worker!.skillType).toBe("WORKER");
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
                { role: "TEMPLATE", filename: "template.md", sortOrder: 1 },
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
    expect(result.skills[0].files[0].role).toBe("TEMPLATE");
    expect(result.skills[0].files[0].filename).toBe("template.md");
    expect(result.skills[0].files[0].content).toBe(
      "# Template Content\n\nHello World",
    );
    expect(result.skills[0].files[0].sortOrder).toBe(1);
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
              content: "# Agent Skill",
              agentConfig: {
                model: "sonnet",
                tools: ["Read", "Write"],
                content: "# Agent body",
              },
            },
          ],

        };
        export default plugin;
      `,
    });

    const result = await loadPluginDefinition(tmpDir);
    const skill = result.skills[0];

    expect(skill.skillType).toBe("WORKER_WITH_SUB_AGENT");
    expect("agentConfig" in skill).toBe(true);
    if ("agentConfig" in skill) {
      expect(skill.agentConfig.model).toBe("sonnet");
      expect(skill.agentConfig.tools).toEqual(["Read", "Write"]);
      expect(skill.agentConfig.content).toBe("# Agent body");
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

  it("ENTRY_POINT スキルの content 未指定時に空文字に補完されること", async () => {
    await createPluginStructure({
      pluginTs: `
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "ENTRY_POINT",
              name: "no-content",
              steps: [],
            },
          ],
        };
        export default plugin;
      `,
    });

    const result = await loadPluginDefinition(tmpDir);
    const skill = result.skills.find((s) => s.name === "no-content");
    expect(skill).toBeDefined();
    expect(skill!.content).toBe("");
  });

  it("Section の bodyFile が正しく解決されること", async () => {
    await createPluginStructure({
      pluginTs: `
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "ENTRY_POINT",
              name: "with-section",
              content: "# With Section",
              steps: [],
              sections: [
                {
                  heading: "参考情報",
                  bodyFile: "reference.md",
                  position: "AFTER_STEPS",
                },
              ],
            },
          ],
        };
        export default plugin;
      `,
      skills: {
        "with-section": {
          skillTs: "",
          files: {
            "reference.md": "# 参考情報の内容\n\nここに詳細を記載",
          },
        },
      },
    });

    const result = await loadPluginDefinition(tmpDir);
    const skill = result.skills[0];
    expect(skill.sections).toBeDefined();
    expect(skill.sections).toHaveLength(1);
    expect(skill.sections![0].heading).toBe("参考情報");
    expect(skill.sections![0].body).toBe("# 参考情報の内容\n\nここに詳細を記載");
    expect(skill.sections![0].bodyFile).toBe("reference.md");
    expect(skill.sections![0].position).toBe("AFTER_STEPS");
  });

  it("InlineStep の bodyFile が正しく解決されること", async () => {
    await createPluginStructure({
      pluginTs: `
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "ENTRY_POINT",
              name: "with-inline",
              content: "# With Inline",
              steps: [
                {
                  inline: "準備ステップ",
                  steps: [
                    {
                      id: "S1",
                      title: "環境構築",
                      bodyFile: "setup.md",
                    },
                  ],
                },
              ],
            },
          ],
        };
        export default plugin;
      `,
      skills: {
        "with-inline": {
          skillTs: "",
          files: {
            "setup.md": "環境構築の手順です",
          },
        },
      },
    });

    const result = await loadPluginDefinition(tmpDir);
    const skill = result.skills[0];
    expect(skill.steps).toBeDefined();
    expect(skill.steps).toHaveLength(1);
    const inlineStep = skill.steps![0] as { inline: string; steps: { id: string; title: string; body: string; bodyFile?: string }[] };
    expect(inlineStep.inline).toBe("準備ステップ");
    expect(inlineStep.steps).toHaveLength(1);
    expect(inlineStep.steps[0].id).toBe("S1");
    expect(inlineStep.steps[0].title).toBe("環境構築");
    expect(inlineStep.steps[0].body).toBe("環境構築の手順です");
    expect(inlineStep.steps[0].bodyFile).toBe("setup.md");
  });

  it("WorkerStep の bodyFile が正しく解決されること", async () => {
    await createPluginStructure({
      pluginTs: `
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "WORKER_WITH_SUB_AGENT",
              name: "worker-skill",
              content: "# Worker",
              agentConfig: {
                model: "sonnet",
                tools: ["Read"],
                content: "# Agent",
              },
              workerSteps: [
                {
                  id: "W1",
                  title: "実装",
                  bodyFile: "implement.md",
                },
              ],
            },
          ],
        };
        export default plugin;
      `,
      skills: {
        "worker-skill": {
          skillTs: "",
          files: {
            "implement.md": "実装手順の詳細",
          },
        },
      },
    });

    const result = await loadPluginDefinition(tmpDir);
    const skill = result.skills[0];
    expect(skill.skillType).toBe("WORKER_WITH_SUB_AGENT");
    if ("workerSteps" in skill) {
      expect(skill.workerSteps).toBeDefined();
      expect(skill.workerSteps).toHaveLength(1);
      expect(skill.workerSteps![0].id).toBe("W1");
      expect(skill.workerSteps![0].title).toBe("実装");
      expect(skill.workerSteps![0].body).toBe("実装手順の詳細");
      expect(skill.workerSteps![0].bodyFile).toBe("implement.md");
    }
  });

  it("WORKER_WITH_AGENT_TEAM スキルの agentTeamMembers を正しく読み込むこと", async () => {
    await createPluginStructure({
      pluginTs: `
        const plugin = {
          name: "test-plugin",
          skills: [
            {
              skillType: "WORKER_WITH_AGENT_TEAM",
              name: "team-skill",
              content: "# Team Skill",
              agentTeamMembers: [
                { skillName: "member-a", sortOrder: 0 },
                { skillName: "member-b", sortOrder: 1 },
              ],
            },
          ],

        };
        export default plugin;
      `,
    });

    const result = await loadPluginDefinition(tmpDir);
    const skill = result.skills[0];

    expect(skill.skillType).toBe("WORKER_WITH_AGENT_TEAM");
    expect("agentTeamMembers" in skill).toBe(true);
    if ("agentTeamMembers" in skill) {
      expect(skill.agentTeamMembers).toHaveLength(2);
      expect(skill.agentTeamMembers[0].skillName).toBe("member-a");
    }
  });
});
