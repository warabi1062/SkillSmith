import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface AgentNodeData {
  label: string;
  description: string | null;
  componentType: "AGENT";
  skillType: null;
  [key: string]: unknown;
}

export default function AgentNode({
  data,
}: NodeProps & { data: AgentNodeData }) {
  const { label, description } = data as AgentNodeData;

  return (
    <div className="agent-node">
      <Handle type="target" position={Position.Top} />
      <div className="agent-node-header">
        <span className="agent-node-badge">AGENT</span>
      </div>
      <div className="agent-node-title">{label}</div>
      {description ? (
        <div className="agent-node-description">{description}</div>
      ) : (
        <div className="agent-node-description agent-node-description-empty">
          (no description)
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
