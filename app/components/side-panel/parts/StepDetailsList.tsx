// 折りたたみ可能なステップ一覧
interface Step {
  id: string;
  title: string;
  body: string;
}

interface StepDetailsListProps {
  steps: Step[];
  defaultOpen?: boolean;
}

export default function StepDetailsList({ steps, defaultOpen = true }: StepDetailsListProps) {
  return (
    <>
      {steps.map((step) => (
        <details key={step.id} className="side-panel-teammate-step" open={defaultOpen}>
          <summary className="side-panel-teammate-step-summary">
            {step.id}. {step.title}
          </summary>
          <pre className="side-panel-teammate-step-body">{step.body}</pre>
        </details>
      ))}
    </>
  );
}
