import { describe, expect, it } from "vitest";
import { buildGraphData } from "../../lib/build-graph-data";

// Minimal component fixture factory
function makeComponent(overrides: {
  id: string;
  type: "SKILL" | "AGENT";
  skillConfig?: { skillType: string; name: string; description?: string | null } | null;
  agentConfig?: { name: string; description?: string | null } | null;
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
        }
      : null,
    agentConfig: overrides.agentConfig
      ? {
          id: `ac-${overrides.id}`,
          componentId: overrides.id,
          name: overrides.agentConfig.name,
          description: overrides.agentConfig.description ?? "",
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

  it("AGENTノードにtype:'agent'が設定されること", () => {
    const components = [
      makeComponent({
        id: "agent-1",
        type: "AGENT",
        agentConfig: { name: "my-agent" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const agentNode = nodes.find((n) => n.id === "agent-1");

    expect(agentNode).toBeDefined();
    expect(agentNode!.type).toBe("agent");
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
    // 並び替えや削除後にorderにギャップ(0, 2, 5)がある場合を想定
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
    // orderの昇順でソートされること
    expect(steps[0].order).toBe(0);
    expect(steps[1].order).toBe(2);
    expect(steps[2].order).toBe(5);
  });

  it("並び替え後のorder値(スワップ済み)でstepsが正しく生成されること", () => {
    // order 0 と order 1 がスワップされた後の状態を想定
    const components = [
      makeComponent({
        id: "orch-1",
        type: "SKILL",
        skillConfig: { skillType: "ENTRY_POINT", name: "dev" },
        dependenciesFrom: [
          { id: "dep-1", targetId: "w-1", order: 1 }, // was 0, swapped to 1
          { id: "dep-2", targetId: "w-2", order: 0 }, // was 1, swapped to 0
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
    // order 0 が先（w-2）、order 1 が後（w-1）
    expect(steps[0].order).toBe(0);
    expect(steps[0].dependencies[0].targetId).toBe("w-2");
    expect(steps[1].order).toBe(1);
    expect(steps[1].dependencies[0].targetId).toBe("w-1");
  });

  it("カスタムノード化されたSkill/Agentノードにstyleが設定されないこと", () => {
    const components = [
      makeComponent({
        id: "worker-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "implement" },
      }),
      makeComponent({
        id: "agent-1",
        type: "AGENT",
        agentConfig: { name: "my-agent" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const workerNode = nodes.find((n) => n.id === "worker-1");
    const agentNode = nodes.find((n) => n.id === "agent-1");

    expect(workerNode!.style).toBeUndefined();
    expect(agentNode!.style).toBeUndefined();
  });

  it("Skill/Agentノードのdataにdescription/componentType/skillTypeが含まれること", () => {
    const components = [
      makeComponent({
        id: "worker-1",
        type: "SKILL",
        skillConfig: { skillType: "WORKER", name: "implement", description: "Implement code" },
      }),
      makeComponent({
        id: "agent-1",
        type: "AGENT",
        agentConfig: { name: "my-agent", description: "Agent desc" },
      }),
    ];

    const { nodes } = buildGraphData(components);
    const workerNode = nodes.find((n) => n.id === "worker-1");
    const agentNode = nodes.find((n) => n.id === "agent-1");

    expect(workerNode!.data).toMatchObject({
      label: "implement",
      description: "Implement code",
      componentType: "SKILL",
      skillType: "WORKER",
    });

    expect(agentNode!.data).toMatchObject({
      label: "my-agent",
      description: "Agent desc",
      componentType: "AGENT",
      skillType: null,
    });
  });

  it("AgentTeamノードにtype:'agentteam'が設定されること", () => {
    const agentTeams = [
      { id: "team-1", name: "Team Alpha", description: "A team", orchestratorName: "dev" },
    ];

    const { nodes } = buildGraphData([], agentTeams);
    const teamNode = nodes.find((n) => n.id === "agentteam-team-1");

    expect(teamNode).toBeDefined();
    expect(teamNode!.type).toBe("agentteam");
  });

  it("AgentTeamノードのdataにdescription/orchestratorNameが含まれること", () => {
    const agentTeams = [
      { id: "team-1", name: "Team Alpha", description: "A team", orchestratorName: "dev" },
    ];

    const { nodes } = buildGraphData([], agentTeams);
    const teamNode = nodes.find((n) => n.id === "agentteam-team-1");

    expect(teamNode!.data).toMatchObject({
      label: "Team Alpha",
      description: "A team",
      orchestratorName: "dev",
    });
  });

  it("AgentTeamノードにstyleが設定されないこと", () => {
    const agentTeams = [
      { id: "team-1", name: "Team Alpha", description: null, orchestratorName: "dev" },
    ];

    const { nodes } = buildGraphData([], agentTeams);
    const teamNode = nodes.find((n) => n.id === "agentteam-team-1");

    expect(teamNode!.style).toBeUndefined();
  });

  it("OrchestratorNodeのdataにdescriptionが含まれること", () => {
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
  });
});
