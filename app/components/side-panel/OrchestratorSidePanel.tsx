// ORCHESTRATOR (ENTRY_POINT) 用サイドパネル
import type { StepFields, SectionFields } from "../SidePanel";
import SidePanelLayout from "./parts/SidePanelLayout";
import ReadonlyField from "./parts/ReadonlyField";
import ContentBlock from "./parts/ContentBlock";
import SectionDetails from "./parts/SectionDetails";

export interface OrchestratorSidePanelProps {
  name: string;
  description: string | null;
  content: string;
  input: string;
  output: string;
  skillType: string | null;
  allowedTools: string | null;
  argumentHint: string | null;
  steps: StepFields[] | null;
  sections: SectionFields[] | null;
  onClose: () => void;
}

// ステップの再帰的表示コンポーネント
function StepItem({ step, index }: { step: StepFields; index: number }) {
  if (step.type === "branch") {
    return (
      <details className="side-panel-orch-step" open>
        <summary className="side-panel-orch-step-summary side-panel-orch-step--branch">
          {index}. {step.label}
        </summary>
        <div className="side-panel-orch-step-content">
          {step.description && (
            <pre className="side-panel-orch-step-desc">{step.description}</pre>
          )}
          {step.cases?.map((c) => (
            <div key={c.name} className="side-panel-orch-case">
              <div className="side-panel-orch-case-label">{c.name}</div>
              <div className="side-panel-orch-case-steps">
                {c.steps.map((s, i) => (
                  <StepItem key={`${s.label}-${i}`} step={s} index={i + 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    );
  }

  if (step.type === "inline") {
    return (
      <details className="side-panel-orch-step" open>
        <summary className="side-panel-orch-step-summary side-panel-orch-step--inline">
          <span className="side-panel-orch-step-type">INLINE</span>
          {index}. {step.label}
        </summary>
        <div className="side-panel-orch-step-content">
          {step.inlineTools && step.inlineTools.length > 0 && (
            <div className="side-panel-inline-tools">
              <span className="side-panel-inline-tools-label">Tools:</span>
              {step.inlineTools.map((tool) => (
                <span key={tool} className="side-panel-agent-tool-tag">{tool}</span>
              ))}
            </div>
          )}
          {step.inlineSteps && step.inlineSteps.length > 0 && (
            <div className="side-panel-inline-substeps">
              {step.inlineSteps.map((subStep) => (
                <details key={subStep.id} className="side-panel-teammate-step">
                  <summary className="side-panel-teammate-step-summary">
                    {subStep.id}. {subStep.title}
                  </summary>
                  <pre className="side-panel-teammate-step-body">{subStep.body}</pre>
                </details>
              ))}
            </div>
          )}
        </div>
      </details>
    );
  }

  return (
    <details className="side-panel-orch-step" open>
      <summary className="side-panel-orch-step-summary side-panel-orch-step--skill">
        <span className="side-panel-orch-step-type">SKILL</span>
        {index}. {step.label}
      </summary>
    </details>
  );
}

export default function OrchestratorSidePanel({
  name,
  description,
  content,
  input,
  output,
  skillType,
  allowedTools,
  argumentHint,
  steps,
  sections,
  onClose,
}: OrchestratorSidePanelProps) {
  return (
    <SidePanelLayout badgeLabel="ORCHESTRATOR" onClose={onClose}>
      <ReadonlyField label="Name" value={name} />
      <ReadonlyField label="Description" value={description || "(no description)"} />

      {skillType && <ReadonlyField label="Skill Type" value={skillType} />}
      {allowedTools && <ReadonlyField label="Allowed Tools" value={allowedTools} />}
      {argumentHint && <ReadonlyField label="Argument Hint" value={argumentHint} />}

      {steps && steps.length > 0 ? (
        <div className="side-panel-orch-structure">
          {sections?.filter(s => s.position === "before-steps").map(s => (
            <SectionDetails key={s.heading} heading={s.heading} body={s.body} />
          ))}

          <label>Steps</label>
          <div className="side-panel-orch-steps">
            {steps.map((step, i) => (
              <StepItem key={`${step.label}-${i}`} step={step} index={i + 1} />
            ))}
          </div>

          {sections?.filter(s => s.position === "after-steps").map(s => (
            <SectionDetails key={s.heading} heading={s.heading} body={s.body} />
          ))}
        </div>
      ) : (
        <ContentBlock label="Content" content={content} />
      )}

      {input && <ReadonlyField label="Input" value={input} />}
      {output && <ReadonlyField label="Output" value={output} />}
    </SidePanelLayout>
  );
}
