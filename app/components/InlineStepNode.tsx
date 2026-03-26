import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface InlineStepNodeData {
  label: string;
  tools?: string[];
  [key: string]: unknown;
}

export default function InlineStepNode({
  data,
}: NodeProps & { data: InlineStepNodeData }) {
  const { label, tools } = data as InlineStepNodeData;

  return (
    <div className="inline-step-node">
      <Handle type="target" position={Position.Left} />
      <div className="inline-step-node-badge">INLINE</div>
      <div className="inline-step-node-title">{label || "(unnamed)"}</div>
      {tools && tools.length > 0 && (
        <div className="inline-step-node-tools">
          {tools.map((tool) => (
            <span key={tool} className="inline-step-node-tool-tag">{tool}</span>
          ))}
        </div>
      )}
    </div>
  );
}
