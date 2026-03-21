import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface Step {
  order: number;
  dependencies: Array<{ id: string; targetId: string }>;
}

interface OrchestratorNodeData {
  label: string;
  steps: Step[];
  [key: string]: unknown;
}

export default function OrchestratorNode({
  data,
}: NodeProps & { data: OrchestratorNodeData }) {
  const { label, steps = [] } = data as OrchestratorNodeData;

  return (
    <div className="orchestrator-node">
      <Handle type="target" position={Position.Top} />
      <div className="orchestrator-node-title">{label}</div>
      {steps.length > 0 && (
        <div className="orchestrator-node-steps">
          {steps.map((step) => (
            <div key={step.order} className="orchestrator-node-step">
              <span>
                Step {step.order + 1}
                {step.dependencies.length > 1 &&
                  ` (x${step.dependencies.length})`}
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
      )}
    </div>
  );
}
