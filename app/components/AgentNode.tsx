import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface AgentNodeData {
  label: string;
  description: string | null;
  componentType: "AGENT";
  skillType: null;
  componentId: string;
  pluginId: string;
  [key: string]: unknown;
}

export default function AgentNode({
  data,
}: NodeProps & { data: AgentNodeData }) {
  const { label, description } = data as AgentNodeData;

  return (
    <div className="agent-node">
      <Handle type="target" position={Position.Left} />
      <div className="agent-node-header">
        <span className="agent-node-badge">AGENT</span>
      </div>
      <div className="agent-node-title">{label || "(unnamed)"}</div>
      <div
        className={`agent-node-description${!description ? " agent-node-description-empty" : ""}`}
      >
        {description || "(no description)"}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
