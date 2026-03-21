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

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 50 });
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
