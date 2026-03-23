import { describe, expect, it } from "vitest";
import { buildGraphData, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from "../../lib/build-graph-data";
import type { LoadedSkillUnion } from "../../lib/types/loader.server";
import type { SkillDependency } from "../../lib/types/plugin";

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
      makeSkill({ skillType: "ENTRY_POINT", name: "dev" }),
      makeSkill({ skillType: "WORKER", name: "implement" }),
    ];
    const deps: SkillDependency[] = [
      { source: "dev", target: "implement", order: 0 },
    ];

    const { nodes } = buildGraphData(skills, deps);
    const orchNode = nodes.find((n) => n.id === "dev");

    expect(orchNode).toBeDefined();
    expect(orchNode!.type).toBe("orchestrator");
  });

  it("stepsがorder順にソートされること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev" }),
      makeSkill({ skillType: "WORKER", name: "w1" }),
      makeSkill({ skillType: "WORKER", name: "w2" }),
      makeSkill({ skillType: "WORKER", name: "w3" }),
    ];
    const deps: SkillDependency[] = [
      { source: "dev", target: "w1", order: 2 },
      { source: "dev", target: "w2", order: 0 },
      { source: "dev", target: "w3", order: 1 },
    ];

    const { nodes } = buildGraphData(skills, deps);
    const orchNode = nodes.find((n) => n.id === "dev");
    const steps = orchNode!.data.steps as Array<{ order: number }>;

    expect(steps).toHaveLength(3);
    expect(steps[0].order).toBe(0);
    expect(steps[1].order).toBe(1);
    expect(steps[2].order).toBe(2);
  });

  it("同一orderの複数依存関係が正しくグルーピングされること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev" }),
      makeSkill({ skillType: "WORKER", name: "w1" }),
      makeSkill({ skillType: "WORKER", name: "w2" }),
      makeSkill({ skillType: "WORKER", name: "w3" }),
    ];
    const deps: SkillDependency[] = [
      { source: "dev", target: "w1", order: 0 },
      { source: "dev", target: "w2", order: 0 },
      { source: "dev", target: "w3", order: 0 },
    ];

    const { nodes, edges } = buildGraphData(skills, deps);
    const orchNode = nodes.find((n) => n.id === "dev");
    const steps = orchNode!.data.steps as Array<{
      order: number;
      dependencies: Array<{ id: string; targetId: string }>;
    }>;

    expect(steps).toHaveLength(1);
    expect(steps[0].order).toBe(0);
    expect(steps[0].dependencies).toHaveLength(3);

    const orchEdges = edges.filter((e) => e.source === "dev");
    for (const edge of orchEdges) {
      expect(edge.sourceHandle).toBe("step-0");
    }
  });

  it("SKILLノード(WORKER)にtype:'skill'が設定されること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "WORKER", name: "implement" }),
    ];

    const { nodes } = buildGraphData(skills, []);
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

    const { nodes } = buildGraphData(skills, []);
    const workerNode = nodes.find((n) => n.id === "implement");

    expect(workerNode).toBeDefined();
    expect(workerNode!.type).toBe("skill");
    expect(workerNode!.data.hasAgentConfig).toBe(true);
  });

  it("agentConfigなしのWORKER SkillはhasAgentConfig=falseであること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "WORKER", name: "implement" }),
    ];

    const { nodes } = buildGraphData(skills, []);
    const workerNode = nodes.find((n) => n.id === "implement");

    expect(workerNode!.data.hasAgentConfig).toBe(false);
  });

  it("ENTRY_POINTノードにstyleが設定されないこと", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev" }),
    ];

    const { nodes } = buildGraphData(skills, []);
    const orchNode = nodes.find((n) => n.id === "dev");

    expect(orchNode).toBeDefined();
    expect(orchNode!.style).toBeUndefined();
  });

  it("order値にギャップがある場合でもstepsが正しい順序で生成されること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev" }),
      makeSkill({ skillType: "WORKER", name: "w1" }),
      makeSkill({ skillType: "WORKER", name: "w2" }),
      makeSkill({ skillType: "WORKER", name: "w3" }),
    ];
    const deps: SkillDependency[] = [
      { source: "dev", target: "w1", order: 5 },
      { source: "dev", target: "w2", order: 0 },
      { source: "dev", target: "w3", order: 2 },
    ];

    const { nodes } = buildGraphData(skills, deps);
    const orchNode = nodes.find((n) => n.id === "dev");
    const steps = orchNode!.data.steps as Array<{ order: number }>;

    expect(steps).toHaveLength(3);
    expect(steps[0].order).toBe(0);
    expect(steps[1].order).toBe(2);
    expect(steps[2].order).toBe(5);
  });

  it("並び替え後のorder値(スワップ済み)でstepsが正しく生成されること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev" }),
      makeSkill({ skillType: "WORKER", name: "w1" }),
      makeSkill({ skillType: "WORKER", name: "w2" }),
    ];
    const deps: SkillDependency[] = [
      { source: "dev", target: "w1", order: 1 },
      { source: "dev", target: "w2", order: 0 },
    ];

    const { nodes } = buildGraphData(skills, deps);
    const orchNode = nodes.find((n) => n.id === "dev");
    const steps = orchNode!.data.steps as Array<{
      order: number;
      dependencies: Array<{ id: string; targetId: string }>;
    }>;

    expect(steps).toHaveLength(2);
    expect(steps[0].order).toBe(0);
    expect(steps[0].dependencies[0].targetId).toBe("w2");
    expect(steps[1].order).toBe(1);
    expect(steps[1].dependencies[0].targetId).toBe("w1");
  });

  it("Skillノードにstyleが設定されないこと", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "WORKER", name: "implement" }),
    ];

    const { nodes } = buildGraphData(skills, []);
    const workerNode = nodes.find((n) => n.id === "implement");

    expect(workerNode!.style).toBeUndefined();
  });

  it("Skillノードのdataにdescription/componentType/skillTypeが含まれること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "WORKER", name: "implement", description: "Implement code" }),
    ];

    const { nodes } = buildGraphData(skills, []);
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

    const { nodes, edges } = buildGraphData(skills, []);
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it("OrchestratorNodeのdataにdescriptionとskillTypeが含まれること", () => {
    const skills: LoadedSkillUnion[] = [
      makeSkill({ skillType: "ENTRY_POINT", name: "dev", description: "Orchestrator desc" }),
    ];

    const { nodes } = buildGraphData(skills, []);
    const orchNode = nodes.find((n) => n.id === "dev");

    expect(orchNode!.data.description).toBe("Orchestrator desc");
    expect(orchNode!.data.skillType).toBe("ENTRY_POINT");
  });

  describe("dagre layout", () => {
    it("nodeSizes引数を渡した場合にレイアウトが計算されること", () => {
      const skills: LoadedSkillUnion[] = [
        makeSkill({ skillType: "ENTRY_POINT", name: "dev" }),
        makeSkill({ skillType: "WORKER", name: "implement" }),
      ];
      const deps: SkillDependency[] = [
        { source: "dev", target: "implement", order: 0 },
      ];

      const nodeSizes = new Map<string, { width: number; height: number }>();
      nodeSizes.set("dev", { width: 300, height: 120 });
      nodeSizes.set("implement", { width: 200, height: 80 });

      const { nodes } = buildGraphData(skills, deps, nodeSizes);
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

      const { nodes } = buildGraphData(skills, []);
      expect(nodes).toHaveLength(2);
      expect(nodes[0].position).toBeDefined();
      expect(nodes[1].position).toBeDefined();
      expect(DEFAULT_NODE_WIDTH).toBe(250);
      expect(DEFAULT_NODE_HEIGHT).toBe(60);
    });

    it("エッジで接続されたノードのソースがターゲットより上に配置されること", () => {
      const skills: LoadedSkillUnion[] = [
        makeSkill({ skillType: "ENTRY_POINT", name: "dev" }),
        makeSkill({ skillType: "WORKER", name: "worker" }),
      ];
      const deps: SkillDependency[] = [
        { source: "dev", target: "worker", order: 0 },
      ];

      const { nodes } = buildGraphData(skills, deps);
      const sourceNode = nodes.find((n) => n.id === "dev")!;
      const targetNode = nodes.find((n) => n.id === "worker")!;

      expect(sourceNode.position.x).toBeLessThan(targetNode.position.x);
    });

    it("サイクルがある場合にグリッドフォールバックが維持されること", () => {
      const skills: LoadedSkillUnion[] = [
        makeSkill({ skillType: "WORKER", name: "A" }),
        makeSkill({ skillType: "WORKER", name: "B" }),
        makeSkill({ skillType: "WORKER", name: "C" }),
      ];
      const deps: SkillDependency[] = [
        { source: "A", target: "B" },
        { source: "B", target: "C" },
        { source: "C", target: "A" },
      ];

      const { nodes } = buildGraphData(skills, deps);
      expect(nodes).toHaveLength(3);
      expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    });
  });
});
