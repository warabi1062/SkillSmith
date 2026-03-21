import dagre from "@dagrejs/dagre";
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

export const DEFAULT_NODE_WIDTH = 250;
export const DEFAULT_NODE_HEIGHT = 100;

export function buildGraphData(
  components: PluginComponent[],
  agentTeams: AgentTeamGraphData[] = [],
  nodeSizes?: Map<string, { width: number; height: number }>,
): {
  nodes: Node[];
  edges: Edge[];
} {
  if (components.length === 0 && agentTeams.length === 0)
    return { nodes: [], edges: [] };

  // Build adjacency for cycle detection
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

  // Cycle detection via topological sort (Kahn's algorithm)
  let processed = 0;
  const tempInDegree = new Map(inDegree);
  const tempQueue: string[] = [];
  for (const c of components) {
    if ((tempInDegree.get(c.id) ?? 0) === 0) {
      tempQueue.push(c.id);
    }
  }
  while (tempQueue.length > 0) {
    const current = tempQueue.shift()!;
    processed++;
    for (const neighbor of adjacency.get(current) ?? []) {
      tempInDegree.set(neighbor, (tempInDegree.get(neighbor) ?? 0) - 1);
      if (tempInDegree.get(neighbor) === 0) {
        tempQueue.push(neighbor);
      }
    }
  }

  const hasCycle = processed < components.length;

  // Position nodes
  const HORIZONTAL_SPACING = 300;
  const VERTICAL_SPACING = 150;

  function getNodeSize(componentId: string): {
    width: number;
    height: number;
  } {
    const size = nodeSizes?.get(componentId);
    return {
      width: size?.width ?? DEFAULT_NODE_WIDTH,
      height: size?.height ?? DEFAULT_NODE_HEIGHT,
    };
  }

  function getPositionWithDagre(): Map<string, { x: number; y: number }> {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 50 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const c of components) {
      const size = getNodeSize(c.id);
      g.setNode(c.id, { width: size.width, height: size.height });
    }

    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    const positions = new Map<string, { x: number; y: number }>();
    for (const c of components) {
      const nodeData = g.node(c.id);
      const size = getNodeSize(c.id);
      // dagre returns center coordinates; convert to top-left
      positions.set(c.id, {
        x: nodeData.x - size.width / 2,
        y: nodeData.y - size.height / 2,
      });
    }

    // Post-process: reorder step targets and their descendants vertically
    // by step order.
    // Build adjacency list (include all edges for nested orchestrator traversal)
    const childrenMap = new Map<string, string[]>();
    for (const edge of edges) {
      if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
      childrenMap.get(edge.source)!.push(edge.target);
    }

    for (const c of components) {
      if (c.skillConfig?.skillType === "ENTRY_POINT" && c.dependenciesFrom) {
        const stepsByOrder = [...c.dependenciesFrom]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (stepsByOrder.length < 2) continue;

        const stepTargetSet = new Set(stepsByOrder.map((d) => d.targetId));
        const targetPositions = stepsByOrder
          .map((dep) => ({ id: dep.targetId, pos: positions.get(dep.targetId) }))
          .filter((t): t is { id: string; pos: { x: number; y: number } } => t.pos != null);

        // Collect descendants via BFS
        function getDescendants(rootId: string): string[] {
          const desc: string[] = [];
          const queue = [rootId];
          const visited = new Set<string>([rootId]);
          while (queue.length > 0) {
            const cur = queue.shift()!;
            for (const child of childrenMap.get(cur) ?? []) {
              if (!visited.has(child) && !stepTargetSet.has(child)) {
                visited.add(child);
                desc.push(child);
                queue.push(child);
              }
            }
          }
          return desc;
        }

        // Compute subtree vertical span for each target
        function getSubtreeHeight(targetId: string): number {
          const targetPos = positions.get(targetId);
          if (!targetPos) return getNodeSize(targetId).height;
          const descs = getDescendants(targetId);
          let minY = targetPos.y;
          let maxYBottom = targetPos.y + getNodeSize(targetId).height;
          for (const descId of descs) {
            const dPos = positions.get(descId);
            if (dPos) {
              minY = Math.min(minY, dPos.y);
              maxYBottom = Math.max(maxYBottom, dPos.y + getNodeSize(descId).height);
            }
          }
          return maxYBottom - minY;
        }

        const oldYs = targetPositions.map((t) => t.pos.y);

        // Recalculate Y positions sequentially, accounting for subtree height
        const orchPos = positions.get(c.id);
        const gap = 50; // nodesep
        const newYs: number[] = [];
        let currentY = orchPos?.y ?? 0;
        for (let i = 0; i < targetPositions.length; i++) {
          newYs.push(currentY);
          const subtreeH = getSubtreeHeight(targetPositions[i].id);
          currentY += subtreeH + gap;
        }

        const moved = new Set<string>();
        for (let i = 0; i < targetPositions.length; i++) {
          const delta = newYs[i] - oldYs[i];
          targetPositions[i].pos.y = newYs[i];
          moved.add(targetPositions[i].id);

          if (delta === 0) continue;
          for (const descId of getDescendants(targetPositions[i].id)) {
            if (moved.has(descId)) continue;
            moved.add(descId);
            const descPos = positions.get(descId);
            if (descPos) descPos.y += delta;
          }
        }
      }
    }

    return positions;
  }

  function getPositionGrid(
    componentId: string,
    index: number,
  ): { x: number; y: number } {
    const cols = Math.ceil(Math.sqrt(components.length));
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { x: col * HORIZONTAL_SPACING, y: row * VERTICAL_SPACING };
  }

  const dagrePositions = hasCycle ? null : getPositionWithDagre();

  const nodes: Node[] = components.map((c, i) => {
    const label = c.skillConfig?.name ?? c.agentConfig?.name ?? "(unnamed)";
    const isOrchestrator = c.skillConfig?.skillType === "ENTRY_POINT";
    const position = hasCycle
      ? getPositionGrid(c.id, i)
      : dagrePositions!.get(c.id)!;

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
        position,
        type: "orchestrator",
        data: { label, steps, description: c.skillConfig?.description ?? null },
      };
    }

    return {
      id: c.id,
      position,
      type: c.type === "SKILL" ? "skill" : "agent",
      data: {
        label,
        description: c.skillConfig?.description ?? c.agentConfig?.description ?? null,
        componentType: c.type,
        skillType: c.skillConfig?.skillType ?? null,
      },
    };
  });

  // Agent Team nodes: placed in a separate row below all component nodes
  if (agentTeams.length > 0) {
    const maxY = nodes.reduce((max, n) => {
      const size = getNodeSize(n.id);
      return Math.max(max, n.position.y + size.height);
    }, 0);
    const teamRowY = maxY + VERTICAL_SPACING / 2;

    for (let i = 0; i < agentTeams.length; i++) {
      const team = agentTeams[i];
      nodes.push({
        id: `agentteam-${team.id}`,
        position: { x: i * HORIZONTAL_SPACING, y: teamRowY },
        type: "agentteam",
        data: {
          label: team.name,
          description: team.description,
          orchestratorName: team.orchestratorName,
        },
      });
    }
  }

  return { nodes, edges };
}
