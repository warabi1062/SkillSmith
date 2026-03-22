import { describe, expect, it } from "vitest";
import { buildGraphData, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from "../../lib/build-graph-data";

// Minimal component fixture factory
function makeComponent(overrides: {
  id: string;
  type: "SKILL";
  skillConfig?: { skillType: string; name: string; description?: string | null; agentConfig?: { id: string } | null } | null;
  dependenciesFrom?: Array<{ id: string; targetId: string; order: number }>;
}) {
  return {
    id: overrides.id,
    type: overrides.type,
    pluginId: "plugin-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    skillConfig: overrides.skillConfig
      ? {
          id: `sc-${overrides.id}`,
          componentId: overrides.id,
          name: overrides.skillConfig.name,
          skillType: overrides.skillConfig.skillType,
          description: overrides.skillConfig.description ?? null,
          agentConfig: overrides.skillConfig.agentConfig ?? null,
        }
      : null,
    dependenciesFrom: overrides.dependenciesFrom ?? [],
    files: [],
  } as unknown as Parameters<typeof buildGraphData>[0][number];
}

describe("buildGraphData", () => {
  it("ENTRY_POINTノードにtype: 'orchestrator'が設定されること", () => {
    const components = [
      makeComponent({
        id: "orch-1",
        type: "SKILL",
        skillConfig: { skillType: "ENTRY_POINT", name: "dev" },
        dependenciesFrom: [
          { id: "dep-1", targetId: "worker-1", order: 0 },
        ],
      }),
      makeComponent({
        id: "worker-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "implement" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const orchNode = nodes.find((n) => n.id === "orch-1");

    expect(orchNode).toBeDefined();
    expect(orchNode!.type).toBe("orchestrator");
  });

  it("stepsがorder順にソートされること", () => {
    const components = [
      makeComponent({
        id: "orch-1",
        type: "SKILL",
        skillConfig: { skillType: "ENTRY_POINT", name: "dev" },
        dependenciesFrom: [
          { id: "dep-1", targetId: "w-1", order: 2 },
          { id: "dep-2", targetId: "w-2", order: 0 },
          { id: "dep-3", targetId: "w-3", order: 1 },
        ],
      }),
      makeComponent({
        id: "w-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w1" },
      }),
      makeComponent({
        id: "w-2",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w2" },
      }),
      makeComponent({
        id: "w-3",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w3" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const orchNode = nodes.find((n) => n.id === "orch-1");
    const steps = orchNode!.data.steps as Array<{ order: number }>;

    expect(steps).toHaveLength(3);
    expect(steps[0].order).toBe(0);
    expect(steps[1].order).toBe(1);
    expect(steps[2].order).toBe(2);
  });

  it("同一orderの複数依存関係が正しくグルーピングされること", () => {
    const components = [
      makeComponent({
        id: "orch-1",
        type: "SKILL",
        skillConfig: { skillType: "ENTRY_POINT", name: "dev" },
        dependenciesFrom: [
          { id: "dep-1", targetId: "w-1", order: 0 },
          { id: "dep-2", targetId: "w-2", order: 0 },
          { id: "dep-3", targetId: "w-3", order: 0 },
        ],
      }),
      makeComponent({
        id: "w-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w1" },
      }),
      makeComponent({
        id: "w-2",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w2" },
      }),
      makeComponent({
        id: "w-3",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w3" },
      }),
    ];

    const { nodes, edges } = buildGraphData(components);
    const orchNode = nodes.find((n) => n.id === "orch-1");
    const steps = orchNode!.data.steps as Array<{
      order: number;
      dependencies: Array<{ id: string; targetId: string }>;
    }>;

    expect(steps).toHaveLength(1);
    expect(steps[0].order).toBe(0);
    expect(steps[0].dependencies).toHaveLength(3);

    const orchEdges = edges.filter((e) => e.source === "orch-1");
    for (const edge of orchEdges) {
      expect(edge.sourceHandle).toBe("step-0");
    }
  });

  it("SKILLノード(WORKER)にtype:'skill'が設定されること", () => {
    const components = [
      makeComponent({
        id: "worker-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "implement" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const workerNode = nodes.find((n) => n.id === "worker-1");

    expect(workerNode).toBeDefined();
    expect(workerNode!.type).toBe("skill");
  });

  it("WORKER Skill + agentConfigノードがskillタイプで生成され、hasAgentConfig=trueであること", () => {
    const components = [
      makeComponent({
        id: "worker-1",
        type: "SKILL",
        skillConfig: {
          skillType: "WORKER_WITH_SUB_AGENT",
          name: "implement",
          agentConfig: { id: "ac-1" },
        },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const workerNode = nodes.find((n) => n.id === "worker-1");

    expect(workerNode).toBeDefined();
    expect(workerNode!.type).toBe("skill");
    expect(workerNode!.data.hasAgentConfig).toBe(true);
  });

  it("agentConfigなしのWORKER SkillはhasAgentConfig=falseであること", () => {
    const components = [
      makeComponent({
        id: "worker-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "implement" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const workerNode = nodes.find((n) => n.id === "worker-1");

    expect(workerNode!.data.hasAgentConfig).toBe(false);
  });

  it("ENTRY_POINTノードにstyleが設定されないこと", () => {
    const components = [
      makeComponent({
        id: "orch-1",
        type: "SKILL",
        skillConfig: { skillType: "ENTRY_POINT", name: "dev" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const orchNode = nodes.find((n) => n.id === "orch-1");

    expect(orchNode).toBeDefined();
    expect(orchNode!.style).toBeUndefined();
  });

  it("order値にギャップがある場合でもstepsが正しい順序で生成されること", () => {
    const components = [
      makeComponent({
        id: "orch-1",
        type: "SKILL",
        skillConfig: { skillType: "ENTRY_POINT", name: "dev" },
        dependenciesFrom: [
          { id: "dep-1", targetId: "w-1", order: 5 },
          { id: "dep-2", targetId: "w-2", order: 0 },
          { id: "dep-3", targetId: "w-3", order: 2 },
        ],
      }),
      makeComponent({
        id: "w-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w1" },
      }),
      makeComponent({
        id: "w-2",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w2" },
      }),
      makeComponent({
        id: "w-3",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w3" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const orchNode = nodes.find((n) => n.id === "orch-1");
    const steps = orchNode!.data.steps as Array<{ order: number }>;

    expect(steps).toHaveLength(3);
    expect(steps[0].order).toBe(0);
    expect(steps[1].order).toBe(2);
    expect(steps[2].order).toBe(5);
  });

  it("並び替え後のorder値(スワップ済み)でstepsが正しく生成されること", () => {
    const components = [
      makeComponent({
        id: "orch-1",
        type: "SKILL",
        skillConfig: { skillType: "ENTRY_POINT", name: "dev" },
        dependenciesFrom: [
          { id: "dep-1", targetId: "w-1", order: 1 },
          { id: "dep-2", targetId: "w-2", order: 0 },
        ],
      }),
      makeComponent({
        id: "w-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w1" },
      }),
      makeComponent({
        id: "w-2",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "w2" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const orchNode = nodes.find((n) => n.id === "orch-1");
    const steps = orchNode!.data.steps as Array<{
      order: number;
      dependencies: Array<{ id: string; targetId: string }>;
    }>;

    expect(steps).toHaveLength(2);
    expect(steps[0].order).toBe(0);
    expect(steps[0].dependencies[0].targetId).toBe("w-2");
    expect(steps[1].order).toBe(1);
    expect(steps[1].dependencies[0].targetId).toBe("w-1");
  });

  it("Skillノードにstyleが設定されないこと", () => {
    const components = [
      makeComponent({
        id: "worker-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "implement" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const workerNode = nodes.find((n) => n.id === "worker-1");

    expect(workerNode!.style).toBeUndefined();
  });

  it("Skillノードのdataにdescription/componentType/skillTypeが含まれること", () => {
    const components = [
      makeComponent({
        id: "worker-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "implement", description: "Implement code" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const workerNode = nodes.find((n) => n.id === "worker-1");

    expect(workerNode!.data).toMatchObject({
      label: "implement",
      description: "Implement code",
      componentType: "SKILL",
      skillType: "WORKER",
    });
  });

  it("agentTeams引数なしでbuildGraphDataが正常動作すること", () => {
    const components = [
      makeComponent({
        id: "worker-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "implement" },
      }),
    ];

    const { nodes, edges } = buildGraphData(components);
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it("OrchestratorNodeのdataにdescriptionとskillTypeが含まれること", () => {
    const components = [
      makeComponent({
        id: "orch-1",
        type: "SKILL",
        skillConfig: { skillType: "ENTRY_POINT", name: "dev", description: "Orchestrator desc" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const orchNode = nodes.find((n) => n.id === "orch-1");

    expect(orchNode!.data.description).toBe("Orchestrator desc");
    expect(orchNode!.data.skillType).toBe("ENTRY_POINT");
  });

  describe("dagre layout", () => {
    it("nodeSizes引数を渡した場合にレイアウトが計算されること", () => {
      const components = [
        makeComponent({
          id: "orch-1",
          type: "SKILL",
          skillConfig: { skillType: "ENTRY_POINT", name: "dev" },
          dependenciesFrom: [
            { id: "dep-1", targetId: "worker-1", order: 0 },
          ],
        }),
        makeComponent({
          id: "worker-1",
          type: "SKILL",
          skillConfig: { skillType: "WORKER", name: "implement" },
        }),
      ];

      const nodeSizes = new Map<string, { width: number; height: number }>();
      nodeSizes.set("orch-1", { width: 300, height: 120 });
      nodeSizes.set("worker-1", { width: 200, height: 80 });

      const { nodes } = buildGraphData(components, nodeSizes);
      const orchNode = nodes.find((n) => n.id === "orch-1");
      const workerNode = nodes.find((n) => n.id === "worker-1");

      expect(orchNode!.position).toBeDefined();
      expect(workerNode!.position).toBeDefined();
      expect(orchNode!.position.y).toBeLessThan(workerNode!.position.y);
    });

    it("nodeSizes未指定時にデフォルトサイズでフォールバックすること", () => {
      const components = [
        makeComponent({
          id: "node-1",
          type: "SKILL",
          skillConfig: { skillType: "WORKER", name: "w1" },
        }),
        makeComponent({
          id: "node-2",
          type: "SKILL",
          skillConfig: { skillType: "WORKER", name: "w2" },
        }),
      ];

      const { nodes } = buildGraphData(components);
      expect(nodes).toHaveLength(2);
      expect(nodes[0].position).toBeDefined();
      expect(nodes[1].position).toBeDefined();
      expect(DEFAULT_NODE_WIDTH).toBe(250);
      expect(DEFAULT_NODE_HEIGHT).toBe(60);
    });

    it("エッジで接続されたノードのソースがターゲットより上に配置されること", () => {
      const components = [
        makeComponent({
          id: "source",
          type: "SKILL",
          skillConfig: { skillType: "ENTRY_POINT", name: "dev" },
          dependenciesFrom: [
            { id: "dep-1", targetId: "target", order: 0 },
          ],
        }),
        makeComponent({
          id: "target",
          type: "SKILL",
          skillConfig: { skillType: "WORKER", name: "worker" },
        }),
      ];

      const { nodes } = buildGraphData(components);
      const sourceNode = nodes.find((n) => n.id === "source")!;
      const targetNode = nodes.find((n) => n.id === "target")!;

      expect(sourceNode.position.x).toBeLessThan(targetNode.position.x);
    });

    it("サイクルがある場合にグリッドフォールバックが維持されること", () => {
      const components = [
        makeComponent({
          id: "a",
          type: "SKILL",
          skillConfig: { skillType: "WORKER", name: "A" },
          dependenciesFrom: [{ id: "dep-1", targetId: "b", order: 0 }],
        }),
        makeComponent({
          id: "b",
          type: "SKILL",
          skillConfig: { skillType: "WORKER", name: "B" },
          dependenciesFrom: [{ id: "dep-2", targetId: "c", order: 0 }],
        }),
        makeComponent({
          id: "c",
          type: "SKILL",
          skillConfig: { skillType: "WORKER", name: "C" },
          dependenciesFrom: [{ id: "dep-3", targetId: "a", order: 0 }],
        }),
      ];

      const { nodes } = buildGraphData(components);
      expect(nodes).toHaveLength(3);
      expect(nodes[0].position).toEqual({ x: 0, y: 0 });
    });
  });
});
