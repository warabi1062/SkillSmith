import type { Node, Edge } from "@xyflow/react";
import type { getPlugin } from "./plugins.server";

export type PluginComponent = Awaited<
  ReturnType<typeof getPlugin>
> extends { components: (infer C)[] } | null
  ? C
  : never;

export interface AgentTeamGraphData {
  id: string;
  name: string;
  description: string | null;
  orchestratorName: string;
}

export function buildGraphData(
  components: PluginComponent[],
  agentTeams: AgentTeamGraphData[] = [],
): {
  nodes: Node[];
  edges: Edge[];
} {
  if (components.length === 0 && agentTeams.length === 0)
    return { nodes: [], edges: [] };

  // Build adjacency for topological sort
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const c of components) {
    adjacency.set(c.id, []);
    inDegree.set(c.id, 0);
  }

  const edges: Edge[] = [];

  for (const c of components) {
    if (c.dependenciesFrom) {
      const isOrchestrator = c.skillConfig?.skillType === "ENTRY_POINT";
      for (const dep of c.dependenciesFrom) {
        const edge: Edge = {
          id: dep.id,
          source: c.id,
          target: dep.targetId,
          deletable: true,
        };
        if (isOrchestrator) {
          edge.sourceHandle = `step-${dep.order}`;
        }
        edges.push(edge);
        adjacency.get(c.id)?.push(dep.targetId);
        inDegree.set(dep.targetId, (inDegree.get(dep.targetId) ?? 0) + 1);
      }
    }
  }

  // Topological sort (Kahn's algorithm) - sources at top
  const depth = new Map<string, number>();
  const queue: string[] = [];

  for (const c of components) {
    if ((inDegree.get(c.id) ?? 0) === 0) {
      queue.push(c.id);
      depth.set(c.id, 0);
    }
  }

  let processed = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    processed++;
    const currentDepth = depth.get(current) ?? 0;

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDepth = currentDepth + 1;
      if (newDepth > (depth.get(neighbor) ?? 0)) {
        depth.set(neighbor, newDepth);
      }
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  const hasCycle = processed < components.length;

  // Build layer index map: componentId -> index within its depth layer
  const layerCounters = new Map<number, number>();
  const layerIndexMap = new Map<string, number>();

  for (const c of components) {
    const d = depth.get(c.id) ?? 0;
    const idx = layerCounters.get(d) ?? 0;
    layerIndexMap.set(c.id, idx);
    layerCounters.set(d, idx + 1);
  }

  // Position nodes
  const HORIZONTAL_SPACING = 250;
  const VERTICAL_SPACING = 100;

  function getPosition(
    componentId: string,
    index: number,
  ): { x: number; y: number } {
    if (hasCycle) {
      const cols = Math.ceil(Math.sqrt(components.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      return { x: col * HORIZONTAL_SPACING, y: row * VERTICAL_SPACING };
    }
    // Hierarchical layout: use depth for y, layer-local index for x
    const d = depth.get(componentId) ?? 0;
    const layerIndex = layerIndexMap.get(componentId) ?? 0;
    return { x: layerIndex * HORIZONTAL_SPACING, y: d * VERTICAL_SPACING };
  }

  const nodes: Node[] = components.map((c, i) => {
    const label = c.skillConfig?.name ?? c.agentConfig?.name ?? "(unnamed)";
    const isOrchestrator = c.skillConfig?.skillType === "ENTRY_POINT";

    if (isOrchestrator) {
      // Build steps data: group dependencies by order
      const orderMap = new Map<
        number,
        Array<{ id: string; targetId: string }>
      >();
      for (const dep of c.dependenciesFrom ?? []) {
        const order = dep.order ?? 0;
        if (!orderMap.has(order)) {
          orderMap.set(order, []);
        }
        orderMap.get(order)!.push({ id: dep.id, targetId: dep.targetId });
      }
      const steps = Array.from(orderMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([order, dependencies]) => ({ order, dependencies }));

      return {
        id: c.id,
        position: getPosition(c.id, i),
        type: "orchestrator",
        data: { label, steps },
      };
    }

    return {
      id: c.id,
      position: getPosition(c.id, i),
      data: { label },
      style: {
        background: c.type === "SKILL" ? "#dbeafe" : "#fce7f3",
        border:
          c.type === "SKILL" ? "1px solid #93c5fd" : "1px solid #f9a8d4",
        borderRadius: "0.375rem",
        padding: "8px 16px",
      },
    };
  });

  // Agent Team nodes: placed in a separate row below all component nodes
  if (agentTeams.length > 0) {
    const maxDepth = components.length > 0
      ? Math.max(...Array.from(depth.values()), 0)
      : -1;
    const teamRowY = (maxDepth + 1) * VERTICAL_SPACING + VERTICAL_SPACING / 2;

    for (let i = 0; i < agentTeams.length; i++) {
      const team = agentTeams[i];
      nodes.push({
        id: `agentteam-${team.id}`,
        position: { x: i * HORIZONTAL_SPACING, y: teamRowY },
        data: { label: team.name },
        style: {
          background: "#dcfce7",
          border: "1px solid #86efac",
          borderRadius: "0.375rem",
          padding: "8px 16px",
        },
      });
    }
  }

  return { nodes, edges };
}
