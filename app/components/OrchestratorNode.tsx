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

// LoadedStep[] を再帰的にレンダリングし、各リーフに Handle を配置する。
// counter.value: Handle ID用のフラットインデックス
// prefix: 階層的ステップ番号のプレフィックス（例: "", "1-A-"）
// localNum: 現在の階層でのステップ番号カウンター
function renderStepsData(
  stepsData: LoadedStep[],
  counter: { value: number },
  prefix: string,
  localNum: { value: number },
  depth: number,
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];

  for (const step of stepsData) {
    if (isLoadedBranch(step)) {
      // 分岐自体にも番号を振る
      const branchNum = localNum.value;
      localNum.value++;
      const branchLabel = prefix ? `${prefix}${branchNum}` : `${branchNum}`;

      // case名からラベルを生成（A, B, C...）
      const caseEntries = Object.entries(step.cases);
      elements.push(
        <div key={`branch-${counter.value}-${step.decisionPoint}`} className="orchestrator-node-branch" style={{ marginLeft: depth * 8 }}>
          <div className="orchestrator-node-branch-header">
            <span className="orchestrator-node-step-num">{branchLabel}</span>
            {step.decisionPoint}
          </div>
          {caseEntries.map(([caseName, caseSteps], caseIdx) => {
            // 分岐ラベル: A, B, C...
            const caseLetter = String.fromCharCode(65 + caseIdx);
            const casePrefix = `${branchLabel}${caseLetter}-`;
            return (
              <div key={caseName} className="orchestrator-node-case">
                <div className="orchestrator-node-case-name">{caseLetter}: {caseName}</div>
                {caseSteps.length > 0 ? (
                  <div className="orchestrator-node-case-steps">
                    {renderStepsData(caseSteps, counter, casePrefix, { value: 1 }, depth + 1)}
                  </div>
                ) : (
                  <div className="orchestrator-node-case-empty">(なし)</div>
                )}
              </div>
            );
          })}
        </div>,
      );
    } else if (isLoadedInlineStep(step)) {
      const index = counter.value;
      const label = prefix ? `${prefix}${localNum.value}` : `${localNum.value}`;
      counter.value++;
      localNum.value++;
      elements.push(
        <div
          key={`inline-${index}`}
          className="orchestrator-node-inline-step"
          style={{ marginLeft: depth * 8 }}
        >
          <span className="orchestrator-node-step-num">{label}</span>
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
      const index = counter.value;
      const label = prefix ? `${prefix}${localNum.value}` : `${localNum.value}`;
      counter.value++;
      localNum.value++;
      elements.push(
        <div key={`step-${index}`} className="orchestrator-node-step" style={{ marginLeft: depth * 8 }}>
          <span className="orchestrator-node-step-num">{label}</span>
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
          renderStepsData(stepsData, { value: 0 }, "", { value: 1 }, 0)
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
