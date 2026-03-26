// 折りたたみ可能なセクション表示
interface SectionDetailsProps {
  heading: string;
  body: string;
}

export default function SectionDetails({ heading, body }: SectionDetailsProps) {
  return (
    <details className="side-panel-orch-section" open>
      <summary className="side-panel-orch-section-summary">{heading}</summary>
      <pre className="side-panel-orch-section-body">{body}</pre>
    </details>
  );
}
