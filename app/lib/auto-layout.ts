import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from "./build-graph-data";
import { applyStepOrderPostProcessing } from "./layout-utils";

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
  // by step order. Dagre doesn't know about step ordering, so we delegate
  // to the shared utility.
  const nodeMap = new Map(updatedComponentNodes.map((n) => [n.id, n]));

  const children = new Map<string, string[]>();
  for (const edge of edges) {
    if (!children.has(edge.source)) children.set(edge.source, []);
    children.get(edge.source)!.push(edge.target);
  }

  const orchestratorIds = componentNodes
    .filter((n) => n.type === "orchestrator")
    .map((n) => n.id);

  applyStepOrderPostProcessing({
    edges,
    orchestratorIds,
    childrenMap: children,
    getPosition: (id) => nodeMap.get(id)?.position,
    setPosition: (id, pos) => {
      const node = nodeMap.get(id);
      if (node) node.position = pos;
    },
    getSize: (id) => {
      const node = nodeMap.get(id);
      return {
        width: node?.measured?.width ?? DEFAULT_NODE_WIDTH,
        height: node?.measured?.height ?? DEFAULT_NODE_HEIGHT,
      };
    },
  });

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
