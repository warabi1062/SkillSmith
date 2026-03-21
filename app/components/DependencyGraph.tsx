import { useCallback } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  type Connection,
  Background,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface DependencyGraphProps {
  nodes: Node[];
  edges: Edge[];
  pluginId: string;
  components: Array<{
    id: string;
    type: string;
    skillConfig: { skillType: string } | null;
  }>;
  onConnect: (sourceId: string, targetId: string) => void;
  onEdgeClick: (dependencyId: string) => void;
}

export default function DependencyGraph({
  nodes,
  edges,
  pluginId,
  components,
  onConnect,
  onEdgeClick,
}: DependencyGraphProps) {
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const { source, target } = connection;
      if (!source || !target) return false;
      if (source === target) return false;

      const sourceComp = components.find((c) => c.id === source);
      const targetComp = components.find((c) => c.id === target);
      if (!sourceComp || !targetComp) return false;

      // Agent -> Skill: target must be WORKER
      if (sourceComp.type === "AGENT" && targetComp.type === "SKILL") {
        if (targetComp.skillConfig?.skillType !== "WORKER") return false;
      }

      // Optimistic validation (UX only): prevents obviously invalid connections
      // in the UI. The server performs the authoritative check within a transaction
      // to prevent race conditions. See dependency.server.ts.
      const adjacency = new Map<string, string[]>();
      for (const edge of edges) {
        const neighbors = adjacency.get(edge.source);
        if (neighbors) {
          neighbors.push(edge.target);
        } else {
          adjacency.set(edge.source, [edge.target]);
        }
      }

      const visited = new Set<string>();
      const stack = [target];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === source) return false;
        if (visited.has(current)) continue;
        visited.add(current);
        const neighbors = adjacency.get(current);
        if (neighbors) {
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              stack.push(neighbor);
            }
          }
        }
      }

      return true;
    },
    [components, edges],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onConnect(connection.source, connection.target);
      }
    },
    [onConnect],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const confirmed = window.confirm("Remove this dependency?");
      if (confirmed) {
        onEdgeClick(edge.id);
      }
    },
    [onEdgeClick],
  );

  return (
    <div className="dependency-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        isValidConnection={isValidConnection}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
