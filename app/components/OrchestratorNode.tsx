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
  onReorderStep?: (dependencyId: string, direction: "up" | "down") => void;
  onDeleteStep?: (dependencyIds: string[]) => void;
  [key: string]: unknown;
}

export default function OrchestratorNode({
  data,
}: NodeProps & { data: OrchestratorNodeData }) {
  const {
    label,
    description,
    steps = [],
    onReorderStep,
    onDeleteStep,
  } = data as OrchestratorNodeData;

  return (
    <div className="orchestrator-node">
      <Handle type="target" position={Position.Top} />
      <div className="orchestrator-node-title">{label}</div>
      {description ? (
        <div className="orchestrator-node-description">{description}</div>
      ) : (
        <div className="orchestrator-node-description orchestrator-node-description-empty">
          (no description)
        </div>
      )}
      {steps.length > 0 && (
        <div className="orchestrator-node-steps">
          {steps.map((step, index) => (
            <div key={step.order} className="orchestrator-node-step">
              <span>
                Step {step.order + 1}
                {step.dependencies.length > 1 &&
                  ` (x${step.dependencies.length})`}
              </span>
              <div className="orchestrator-node-step-actions">
                {onReorderStep && (
                  <>
                    <button
                      type="button"
                      className="orchestrator-node-step-btn"
                      title="Move up"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorderStep(step.dependencies[0].id, "up");
                      }}
                    >
                      ^
                    </button>
                    <button
                      type="button"
                      className="orchestrator-node-step-btn"
                      title="Move down"
                      disabled={index === steps.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorderStep(step.dependencies[0].id, "down");
                      }}
                    >
                      v
                    </button>
                  </>
                )}
                {onDeleteStep && (
                  <button
                    type="button"
                    className="orchestrator-node-step-btn orchestrator-node-step-btn-danger"
                    title="Delete step"
                    onClick={(e) => {
                      e.stopPropagation();
                      const ids = step.dependencies.map((d) => d.id);
                      onDeleteStep(ids);
                    }}
                  >
                    x
                  </button>
                )}
              </div>
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
