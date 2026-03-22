import { useCallback, useEffect, useState } from "react";
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
  componentId: string;
  pluginId: string;
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
    onReorderStep,
    onDeleteStep,
  } = data as OrchestratorNodeData;

  // localStepsはサーバー永続化済みステップとクライアント専用の空ステップスロットの両方を管理する。
  // 空ステップ（依存関係のないもの）はサーバーリロード時に意図的に失われる。
  const [localSteps, setLocalSteps] = useState<Step[]>(steps);

  // JSON.stringifyで依存関係を安定化: React Flowはコンテンツが同一でも
  // レンダーごとに新しい配列参照を生成する可能性がある。
  // これがないと、setLocalStepsがレンダーごとに発火し、ユーザーが追加した
  // クライアント専用の空ステップスロットが破棄される。
  const stepsJson = JSON.stringify(steps);
  useEffect(() => {
    // data.stepsが実際に変更されたときにlocalStepsをサーバーデータと同期する。
    // 未保存の空ステップスロットは意図的に破棄される。
    setLocalSteps(JSON.parse(stepsJson));
  }, [stepsJson]);

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
                          disabled={
                            // localSteps.lengthではなく、サーバー永続化済みステップ数
                            // （依存関係を持つステップ）を使用する。localStepsには末尾に
                            // クライアント専用の空スロットが含まれる場合があるため。
                            index ===
                            localSteps.filter((s) => s.dependencies.length > 0)
                              .length - 1
                          }
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
