import { useCallback } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeMouseHandler,
  Background,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface DependencyGraphProps {
  nodes: Node[];
  edges: Edge[];
}

export default function DependencyGraph({
  nodes,
  edges,
}: DependencyGraphProps) {
  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    alert(node.data.label as string);
  }, []);

  return (
    <div className="dependency-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
