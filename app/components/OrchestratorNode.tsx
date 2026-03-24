import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
// LoadedStep 型をインラインで定義（loader.server.ts はサーバー専用のためクライアントからインポート不可）
interface LoadedBranch {
  decisionPoint: string;
  cases: Record<string, LoadedStep[]>;
}

interface LoadedInlineStep {
  inline: string;
}

type LoadedStep = string | LoadedBranch | LoadedInlineStep;

function isLoadedBranch(step: LoadedStep): step is LoadedBranch {
  return typeof step === "object" && "decisionPoint" in step && "cases" in step;
}

function isLoadedInlineStep(step: LoadedStep): step is LoadedInlineStep {
  return typeof step === "object" && "inline" in step && !("decisionPoint" in step);
}

interface Step {
  order: number;
  dependencies: Array<{ id: string; targetId: string }>;
}

interface OrchestratorNodeData {
  label: string;
  description?: string | null;
  steps: Step[];
  stepsData?: LoadedStep[];
  skillType?: string | null;
  [key: string]: unknown;
}

// LoadedStep[] を再帰的にレンダリングし、各リーフスキルに Handle を配置する。
// flatIndex はフラット化順序を追跡するカウンター（参照渡し）。
function renderStepsData(
  stepsData: LoadedStep[],
  counter: { value: number },
  depth: number,
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];

  for (const step of stepsData) {
    if (isLoadedBranch(step)) {
      // 分岐ノードのレンダリング
      elements.push(
        <div key={`branch-${counter.value}-${step.decisionPoint}`} className="orchestrator-node-branch" style={{ marginLeft: depth * 8 }}>
          <div className="orchestrator-node-branch-header">
            {step.decisionPoint}
          </div>
          {Object.entries(step.cases).map(([caseName, caseSteps]) => (
            <div key={caseName} className="orchestrator-node-case">
              <div className="orchestrator-node-case-name">{caseName}</div>
              {caseSteps.length > 0 ? (
                <div className="orchestrator-node-case-steps">
                  {renderStepsData(caseSteps, counter, depth + 1)}
                </div>
              ) : (
                <div className="orchestrator-node-case-empty">(なし)</div>
              )}
            </div>
          ))}
        </div>,
      );
    } else if (isLoadedInlineStep(step)) {
      // インラインステップ: スキルと同様にHandle付きでレンダリング
      const index = counter.value;
      counter.value++;
      elements.push(
        <div
          key={`inline-${index}`}
          className="orchestrator-node-inline-step"
          style={{ marginLeft: depth * 8 }}
        >
          <span>{step.inline}</span>
          <Handle
            type="source"
            position={Position.Right}
            id={`step-${index}`}
            style={{ top: "auto", position: "relative" }}
          />
        </div>,
      );
    } else {
      // リーフスキル（通常ステップ）のレンダリング
      const index = counter.value;
      counter.value++;
      elements.push(
        <div key={`step-${index}`} className="orchestrator-node-step" style={{ marginLeft: depth * 8 }}>
          <span>{step}</span>
          <Handle
            type="source"
            position={Position.Right}
            id={`step-${index}`}
            style={{ top: "auto", position: "relative" }}
          />
        </div>,
      );
    }
  }

  return elements;
}

export default function OrchestratorNode({
  data,
}: NodeProps & { data: OrchestratorNodeData }) {
  const {
    label,
    description,
    steps = [],
    stepsData,
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
        {stepsData ? (
          // steps フィールドがある場合: 分岐構造をレンダリング
          renderStepsData(stepsData, { value: 0 }, 0)
        ) : (
          // 従来の線形ステップ表示
          steps.map((step) => (
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
          ))
        )}
      </div>
    </div>
  );
}
