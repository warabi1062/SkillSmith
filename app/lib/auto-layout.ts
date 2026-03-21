import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from "./build-graph-data";

const HORIZONTAL_SPACING = 300;
const VERTICAL_SPACING = 150;

/**
 * Compute auto-layout positions for the given nodes and edges using dagre.
 * Returns a new array of nodes with updated positions.
 * AgentTeam nodes (id prefix "agentteam-") are excluded from dagre layout
 * and placed in a separate row below component nodes.
 */
export function computeAutoLayout(
  currentNodes: Node[],
  edges: Edge[],
): Node[] {
  const componentNodes = currentNodes.filter(
    (n) => !n.id.startsWith("agentteam-"),
  );
  const agentTeamNodes = currentNodes.filter((n) =>
    n.id.startsWith("agentteam-"),
  );

  if (componentNodes.length === 0) {
    return [...currentNodes];
  }

  // Cycle detection via topological sort (Kahn's algorithm)
  // dagre assumes a DAG; cycles produce unpredictable results
  const componentIds = new Set(componentNodes.map((n) => n.id));
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const node of componentNodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    if (componentIds.has(edge.source) && componentIds.has(edge.target)) {
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  let processed = 0;
  const tempQueue = [...queue];
  while (tempQueue.length > 0) {
    const current = tempQueue.shift()!;
    processed++;
    for (const neighbor of adjacency.get(current) ?? []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        tempQueue.push(neighbor);
      }
    }
  }
  if (processed < componentNodes.length) {
    // Cycle detected: return nodes unchanged
    return [...currentNodes];
  }

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 2 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of componentNodes) {
    const width = node.measured?.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? DEFAULT_NODE_HEIGHT;
    g.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    // Only add edges between component nodes
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const updatedComponentNodes = componentNodes.map((node) => {
    const nodeData = g.node(node.id);
    const width = node.measured?.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? DEFAULT_NODE_HEIGHT;
    return {
      ...node,
      position: {
        x: nodeData.x - width / 2,
        y: nodeData.y - height / 2,
      },
    };
  });

  // Post-process: reorder step targets (and their descendants) vertically
  // by step order. Dagre doesn't know about step ordering, so we compute
  // a Y delta for each step target and apply it to the entire subtree.
  const orchestratorNodes = componentNodes.filter((n) => n.type === "orchestrator");
  const orchestratorIds = new Set(orchestratorNodes.map((n) => n.id));

  // Build adjacency list for descendant traversal (include all edges)
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    if (!children.has(edge.source)) children.set(edge.source, []);
    children.get(edge.source)!.push(edge.target);
  }

  const nodeMap = new Map(updatedComponentNodes.map((n) => [n.id, n]));

  // Sort orchestrators: process innermost (children) first, then outermost (parents).
  // An orchestrator that is reachable from another orchestrator is "inner".
  function isAncestor(ancestorId: string, descendantId: string): boolean {
    const queue = [ancestorId];
    const visited = new Set<string>([ancestorId]);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const child of children.get(cur) ?? []) {
        if (child === descendantId) return true;
        if (!visited.has(child)) {
          visited.add(child);
          queue.push(child);
        }
      }
    }
    return false;
  }

  const sortedOrchIds = [...orchestratorIds].sort((a, b) => {
    if (isAncestor(a, b)) return 1;  // a is parent of b → process b first
    if (isAncestor(b, a)) return -1; // b is parent of a → process a first
    return 0;
  });

  for (const orchId of sortedOrchIds) {
    const stepTargets: { order: number; targetId: string }[] = [];
    for (const edge of edges) {
      if (
        edge.source === orchId &&
        edge.sourceHandle?.startsWith("step-")
      ) {
        const order = parseInt(edge.sourceHandle.replace("step-", ""), 10);
        stepTargets.push({ order, targetId: edge.target });
      }
    }
    if (stepTargets.length < 2) continue;

    stepTargets.sort((a, b) => a.order - b.order);

    const orchNode = nodeMap.get(orchId);
    const orchY = orchNode?.position.y ?? 0;

    const targetNodes = stepTargets
      .map((st) => nodeMap.get(st.targetId))
      .filter((n): n is (typeof updatedComponentNodes)[number] => n != null);

    // Collect descendants for each step target (excluding other step targets)
    const stepTargetSet = new Set(stepTargets.map((st) => st.targetId));
    function getDescendants(rootId: string): string[] {
      const descendants: string[] = [];
      const queue = [rootId];
      const visited = new Set<string>([rootId]);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const child of children.get(current) ?? []) {
          if (!visited.has(child) && !stepTargetSet.has(child)) {
            visited.add(child);
            descendants.push(child);
            queue.push(child);
          }
        }
      }
      return descendants;
    }

    // Compute the vertical extent below the target node (target + descendants).
    // Also considers the target node's own height (e.g. a tall orchestrator
    // whose step targets don't extend beyond its own bottom edge).
    function getSubtreeDepth(targetNode: (typeof updatedComponentNodes)[number]): number {
      const targetHeight = targetNode.measured?.height ?? DEFAULT_NODE_HEIGHT;
      const descs = getDescendants(targetNode.id);
      let maxYBottom = targetNode.position.y + targetHeight;
      for (const descId of descs) {
        const d = nodeMap.get(descId);
        if (d) {
          maxYBottom = Math.max(maxYBottom, d.position.y + (d.measured?.height ?? DEFAULT_NODE_HEIGHT));
        }
      }
      // Ensure at least the target's own height is used
      return Math.max(targetHeight, maxYBottom - targetNode.position.y);
    }

    // Record old Y positions before reordering
    const oldYs = targetNodes.map((n) => n.position.y);

    // Recalculate Y positions sequentially, accounting for subtree height
    const gap = 10;
    const newYs: number[] = [];
    let currentY = orchY;
    for (let i = 0; i < targetNodes.length; i++) {
      newYs.push(currentY);
      const subtreeHeight = getSubtreeDepth(targetNodes[i]);
      currentY += subtreeHeight + gap;
    }

    // Apply delta to each step target and its descendants
    const moved = new Set<string>();
    for (let i = 0; i < targetNodes.length; i++) {
      const delta = newYs[i] - oldYs[i];
      if (delta === 0) continue;

      const node = targetNodes[i];
      node.position = { ...node.position, y: newYs[i] };
      moved.add(node.id);

      for (const descId of getDescendants(node.id)) {
        if (moved.has(descId)) continue;
        moved.add(descId);
        const descNode = nodeMap.get(descId);
        if (descNode) {
          descNode.position = {
            ...descNode.position,
            y: descNode.position.y + delta,
          };
        }
      }
    }
  }

  // Place AgentTeam nodes below component nodes
  if (agentTeamNodes.length > 0) {
    const maxY = updatedComponentNodes.reduce((max, n) => {
      const height = n.measured?.height ?? DEFAULT_NODE_HEIGHT;
      return Math.max(max, n.position.y + height);
    }, 0);
    const teamRowY = maxY + VERTICAL_SPACING / 2;

    const updatedTeamNodes = agentTeamNodes.map((node, i) => ({
      ...node,
      position: { x: i * HORIZONTAL_SPACING, y: teamRowY },
    }));

    return [...updatedComponentNodes, ...updatedTeamNodes];
  }

  return updatedComponentNodes;
}
