import { describe, expect, it } from "vitest";
import { buildGraphData, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from "../../lib/build-graph-data";
import type { LoadedSkillUnion } from "../../lib/types/loader.server";

// LoadedSkillUnion ファクトリ
function makeSkill(overrides: Partial<LoadedSkillUnion> & { name: string; skillType: string }): LoadedSkillUnion {
  return {
    content: "",
    files: [],
    ...overrides,
  } as LoadedSkillUnion;
}

describe("buildGraphData", () => {
  it("ENTRY_POINTノードにtype: 'orchestrator'が設定されること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev", dependencies: ["implement"] }),
      makeSkill({ skillType: "WORKER", name: "implement" }),
    ];

    const { nodes } = buildGraphData(skills);
    const orchNode = nodes.find((n) => n.id === "dev");

    expect(orchNode).toBeDefined();
    expect(orchNode!.type).toBe("orchestrator");
  });

  it("stepsがorder順にソートされること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev", dependencies: ["w1", "w2", "w3"] }),
      makeSkill({ skillType: "WORKER", name: "w1" }),
      makeSkill({ skillType: "WORKER", name: "w2" }),
      makeSkill({ skillType: "WORKER", name: "w3" }),
    ];

    const { nodes } = buildGraphData(skills);
    const orchNode = nodes.find((n) => n.id === "dev");
    const steps = orchNode!.data.steps as Array<{ order: number }>;

    expect(steps).toHaveLength(3);
    expect(steps[0].order).toBe(0);
    expect(steps[1].order).toBe(1);
    expect(steps[2].order).toBe(2);
  });

  it("SKILLノード(WORKER)にtype:'skill'が設定されること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "WORKER", name: "implement" }),
    ];

    const { nodes } = buildGraphData(skills);
    const workerNode = nodes.find((n) => n.id === "implement");

    expect(workerNode).toBeDefined();
    expect(workerNode!.type).toBe("skill");
  });

  it("WORKER_WITH_SUB_AGENT + agentConfigノードがskillタイプで生成され、hasAgentConfig=trueであること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({
        skillType: "WORKER_WITH_SUB_AGENT",
        name: "implement",
        agentConfig: { model: "sonnet", content: "# Agent" },
      } as any),
    ];

    const { nodes } = buildGraphData(skills);
    const workerNode = nodes.find((n) => n.id === "implement");

    expect(workerNode).toBeDefined();
    expect(workerNode!.type).toBe("skill");
    expect(workerNode!.data.hasAgentConfig).toBe(true);
  });

  it("agentConfigなしのWORKER SkillはhasAgentConfig=falseであること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "WORKER", name: "implement" }),
    ];

    const { nodes } = buildGraphData(skills);
    const workerNode = nodes.find((n) => n.id === "implement");

    expect(workerNode!.data.hasAgentConfig).toBe(false);
  });

  it("ENTRY_POINTノードにstyleが設定されないこと", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev" }),
    ];

    const { nodes } = buildGraphData(skills);
    const orchNode = nodes.find((n) => n.id === "dev");

    expect(orchNode).toBeDefined();
    expect(orchNode!.style).toBeUndefined();
  });

  it("依存関係の順序でstepsが正しく生成されること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev", dependencies: ["w2", "w3", "w1"] }),
      makeSkill({ skillType: "WORKER", name: "w1" }),
      makeSkill({ skillType: "WORKER", name: "w2" }),
      makeSkill({ skillType: "WORKER", name: "w3" }),
    ];

    const { nodes } = buildGraphData(skills);
    const orchNode = nodes.find((n) => n.id === "dev");
    const steps = orchNode!.data.steps as Array<{
      order: number;
      dependencies: Array<{ id: string; targetId: string }>;
    }>;

    expect(steps).toHaveLength(3);
    expect(steps[0].order).toBe(0);
    expect(steps[0].dependencies[0].targetId).toBe("w2");
    expect(steps[1].order).toBe(1);
    expect(steps[1].dependencies[0].targetId).toBe("w3");
    expect(steps[2].order).toBe(2);
    expect(steps[2].dependencies[0].targetId).toBe("w1");
  });

  it("Skillノードにstyleが設定されないこと", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "WORKER", name: "implement" }),
    ];

    const { nodes } = buildGraphData(skills);
    const workerNode = nodes.find((n) => n.id === "implement");

    expect(workerNode!.style).toBeUndefined();
  });

  it("Skillノードのdataにdescription/componentType/skillTypeが含まれること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "WORKER", name: "implement", description: "Implement code" }),
    ];

    const { nodes } = buildGraphData(skills);
    const workerNode = nodes.find((n) => n.id === "implement");

    expect(workerNode!.data).toMatchObject({
      label: "implement",
      description: "Implement code",
      componentType: "SKILL",
      skillType: "WORKER",
    });
  });

  it("依存関係なしでbuildGraphDataが正常動作すること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "WORKER", name: "implement" }),
    ];

    const { nodes, edges } = buildGraphData(skills);
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it("OrchestratorNodeのdataにdescriptionとskillTypeが含まれること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev", description: "Orchestrator desc" }),
    ];

    const { nodes } = buildGraphData(skills);
    const orchNode = nodes.find((n) => n.id === "dev");

    expect(orchNode!.data.description).toBe("Orchestrator desc");
    expect(orchNode!.data.skillType).toBe("ENTRY_POINT");
  });

  describe("dagre layout", () => {
    it("nodeSizes引数を渡した場合にレイアウトが計算されること", () => {
      const skills: LoadedSkillUnion[] = [
        makeSkill({ skillType: "ENTRY_POINT", name: "dev", dependencies: ["implement"] }),
        makeSkill({ skillType: "WORKER", name: "implement" }),
      ];

      const nodeSizes = new Map<string, { width: number; height: number }>();
      nodeSizes.set("dev", { width: 300, height: 120 });
      nodeSizes.set("implement", { width: 200, height: 80 });

      const { nodes } = buildGraphData(skills, nodeSizes);
      const orchNode = nodes.find((n) => n.id === "dev");
      const workerNode = nodes.find((n) => n.id === "implement");

      expect(orchNode!.position).toBeDefined();
      expect(workerNode!.position).toBeDefined();
      expect(orchNode!.position.y).toBeLessThan(workerNode!.position.y);
    });

    it("nodeSizes未指定時にデフォルトサイズでフォールバックすること", () => {
      const skills: LoadedSkillUnion[] = [
        makeSkill({ skillType: "WORKER", name: "w1" }),
        makeSkill({ skillType: "WORKER", name: "w2" }),
      ];

      const { nodes } = buildGraphData(skills);
      expect(nodes).toHaveLength(2);
      expect(nodes[0].position).toBeDefined();
      expect(nodes[1].position).toBeDefined();
      expect(DEFAULT_NODE_WIDTH).toBe(250);
      expect(DEFAULT_NODE_HEIGHT).toBe(60);
    });

    it("エッジで接続されたノードのソースがターゲットより上に配置されること", () => {
      const skills: LoadedSkillUnion[] = [
        makeSkill({ skillType: "ENTRY_POINT", name: "dev", dependencies: ["worker"] }),
        makeSkill({ skillType: "WORKER", name: "worker" }),
      ];

      const { nodes } = buildGraphData(skills);
      const sourceNode = nodes.find((n) => n.id === "dev")!;
      const targetNode = nodes.find((n) => n.id === "worker")!;

      expect(sourceNode.position.x).toBeLessThan(targetNode.position.x);
    });

    it("サイクルがある場合にグリッドフォールバックが維持されること", () => {
      const skills: LoadedSkillUnion[] = [
        makeSkill({ skillType: "WORKER", name: "A", dependencies: ["B"] }),
        makeSkill({ skillType: "WORKER", name: "B", dependencies: ["C"] }),
        makeSkill({ skillType: "WORKER", name: "C", dependencies: ["A"] }),
      ];

      const { nodes } = buildGraphData(skills);
      expect(nodes).toHaveLength(3);
      expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    });
  });
});
