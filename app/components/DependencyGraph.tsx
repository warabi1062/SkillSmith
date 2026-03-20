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
        return targetComp.skillConfig?.skillType === "WORKER";
      }

      return true;
    },
    [components],
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
