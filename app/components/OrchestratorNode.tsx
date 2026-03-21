import { useCallback, useEffect, useState } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useFetcher } from "react-router";
import InlineEditableField from "./InlineEditableField";

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
  componentId: string;
  pluginId: string;
  skillType?: string | null;
  [key: string]: unknown;
}

export default function OrchestratorNode({
  id,
  data,
}: NodeProps & { data: OrchestratorNodeData }) {
  const {
    label,
    description,
    steps = [],
    onReorderStep,
    onDeleteStep,
    componentId,
    pluginId,
    skillType,
  } = data as OrchestratorNodeData;
  const fetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";
  const { setNodes } = useReactFlow();

  // localSteps manages both server-persisted steps and client-only empty step slots.
  // Empty steps (those with no dependencies) are intentionally lost on server reload.
  const [localSteps, setLocalSteps] = useState<Step[]>(steps);

  useEffect(() => {
    // Sync localSteps with server data when data.steps changes.
    // This intentionally discards any unsaved empty step slots.
    setLocalSteps(steps);
  }, [steps]);

  const handleAddStep = useCallback(() => {
    setLocalSteps((prev) => {
      const maxOrder =
        prev.length > 0 ? Math.max(...prev.map((s) => s.order)) : -1;
      return [...prev, { order: maxOrder + 1, dependencies: [] }];
    });
  }, []);

  const handleRemoveEmptyStep = useCallback((order: number) => {
    setLocalSteps((prev) => prev.filter((s) => s.order !== order));
  }, []);

  const handleEditStart = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, draggable: false } : n)),
    );
  }, [id, setNodes]);

  const handleEditEnd = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, draggable: true } : n)),
    );
  }, [id, setNodes]);

  const handleSaveName = useCallback(
    (name: string) => {
      fetcher.submit(
        {
          intent: "update-component",
          componentId,
          name,
          description: description ?? "",
          skillType: skillType ?? "",
        },
        { method: "post", action: `/plugins/${pluginId}` },
      );
    },
    [fetcher, componentId, description, skillType, pluginId],
  );

  const handleSaveDescription = useCallback(
    (newDescription: string) => {
      fetcher.submit(
        {
          intent: "update-component",
          componentId,
          name: label,
          description: newDescription,
          skillType: skillType ?? "",
        },
        { method: "post", action: `/plugins/${pluginId}` },
      );
    },
    [fetcher, componentId, label, skillType, pluginId],
  );

  return (
    <div className="orchestrator-node">
      <Handle type="target" position={Position.Top} />
      <InlineEditableField
        value={label}
        onSave={handleSaveName}
        isLoading={isSaving}
        error={null}
        placeholder="(unnamed)"
        className="orchestrator-node-title"
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />
      <InlineEditableField
        value={description ?? ""}
        onSave={handleSaveDescription}
        isLoading={isSaving}
        error={null}
        placeholder="(no description)"
        multiline
        className="orchestrator-node-description"
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />
      <div className="orchestrator-node-steps">
        {localSteps.map((step, index) => {
          const isEmpty = step.dependencies.length === 0;
          return (
            <div
              key={step.order}
              className={`orchestrator-node-step${isEmpty ? " orchestrator-node-step--empty" : ""}`}
            >
              <span>
                {isEmpty
                  ? `Step ${step.order + 1} (empty)`
                  : `Step ${step.order + 1}${step.dependencies.length > 1 ? ` (x${step.dependencies.length})` : ""}`}
              </span>
              <div className="orchestrator-node-step-actions">
                {isEmpty ? (
                  <button
                    type="button"
                    className="orchestrator-node-step-btn orchestrator-node-step-btn-cancel"
                    title="Cancel"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEmptyStep(step.order);
                    }}
                  >
                    x
                  </button>
                ) : (
                  <>
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
                          disabled={index === localSteps.length - 1}
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
                  </>
                )}
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={`step-${step.order}`}
                style={{ top: "auto", position: "relative" }}
              />
            </div>
          );
        })}
        <button
          type="button"
          className="orchestrator-node-add-step-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleAddStep();
          }}
        >
          + Step
        </button>
      </div>
    </div>
  );
}
