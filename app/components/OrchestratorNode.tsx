import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface Step {
  order: number;
  dependencies: Array<{ id: string; targetId: string }>;
}

interface OrchestratorNodeData {
  label: string;
  description?: string | null;
  steps: Step[];
  skillType?: string | null;
  [key: string]: unknown;
}

export default function OrchestratorNode({
  data,
}: NodeProps & { data: OrchestratorNodeData }) {
  const {
    label,
    description,
    steps = [],
  } = data as OrchestratorNodeData;

  return (
    <div className="orchestrator-node">
      <Handle type="target" position={Position.Left} />
      <div className="orchestrator-node-title">{label || "(unnamed)"}</div>
      <div
        className={`orchestrator-node-description${!description ? " orchestrator-node-description-empty" : ""}`}
      >
        {description || "(no description)"}
      </div>
      <div className="orchestrator-node-steps">
        {steps.map((step) => (
          <div
            key={step.order}
            className="orchestrator-node-step"
          >
            <span>
              {`Step ${step.order + 1}${step.dependencies.length > 1 ? ` (x${step.dependencies.length})` : ""}`}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={`step-${step.order}`}
              style={{ top: "auto", position: "relative" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
