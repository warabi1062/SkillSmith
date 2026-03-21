import { describe, expect, it } from "vitest";
import { buildGraphData } from "../plugins.$id";

// Minimal component fixture factory
function makeComponent(overrides: {
  id: string;
  type: "SKILL" | "AGENT";
  skillConfig?: { skillType: string; name: string } | null;
  agentConfig?: { name: string } | null;
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
          description: null,
        }
      : null,
    agentConfig: overrides.agentConfig
      ? {
          id: `ac-${overrides.id}`,
          componentId: overrides.id,
          name: overrides.agentConfig.name,
          description: "",
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

  it("非ENTRY_POINTノードにtypeが設定されないこと", () => {
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
    expect(workerNode!.type).toBeUndefined();
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

  it("非ENTRY_POINTノードには従来通りstyleが設定されること", () => {
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
    expect(workerNode!.style).toBeDefined();
    expect(workerNode!.style).toHaveProperty("background");
  });
});
