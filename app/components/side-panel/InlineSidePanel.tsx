// INLINE ステップ用サイドパネル
import type { InlineSubStepFields } from "../SidePanel";
import SidePanelLayout from "./parts/SidePanelLayout";
import ReadonlyField from "./parts/ReadonlyField";
import ContentBlock from "./parts/ContentBlock";
import StepDetailsList from "./parts/StepDetailsList";
import ToolTagList from "./parts/ToolTagList";

export interface InlineSidePanelProps {
  name: string;
  description: string | null;
  content: string;
  input: string;
  output: string;
  inlineSteps: InlineSubStepFields[] | null;
  inlineTools: string[] | null;
  onClose: () => void;
}

export default function InlineSidePanel({
  name,
  description,
  content,
  input,
  output,
  inlineSteps,
  inlineTools,
  onClose,
}: InlineSidePanelProps) {
  const hasStructuredView = inlineSteps && inlineSteps.length > 0;

  return (
    <SidePanelLayout badgeLabel="INLINE STEP" onClose={onClose}>
      <ReadonlyField label="Name" value={name} />
      <ReadonlyField label="Description" value={description || "(no description)"} />

      {hasStructuredView ? (
        <div className="side-panel-orch-structure">
          {inlineTools && <ToolTagList label="Tools:" tools={inlineTools} />}
          <label>Steps</label>
          <div className="side-panel-orch-steps">
            <StepDetailsList steps={inlineSteps} />
          </div>
        </div>
      ) : (
        <ContentBlock label="Content" content={content} />
      )}

      {input && <ReadonlyField label="Input" value={input} />}
      {output && <ReadonlyField label="Output" value={output} />}
    </SidePanelLayout>
  );
}
