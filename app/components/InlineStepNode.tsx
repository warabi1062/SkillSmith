import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface InlineStepNodeData {
  label: string;
  [key: string]: unknown;
}

export default function InlineStepNode({
  data,
}: NodeProps & { data: InlineStepNodeData }) {
  const { label } = data as InlineStepNodeData;

  return (
    <div className="inline-step-node">
      <Handle type="target" position={Position.Left} />
      <div className="inline-step-node-badge">INLINE</div>
      <div className="inline-step-node-title">{label || "(unnamed)"}</div>
    </div>
  );
}
