// pre形式のコンテンツ表示
interface ContentBlockProps {
  label: string;
  content: string;
}

export default function ContentBlock({ label, content }: ContentBlockProps) {
  return (
    <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <label>{label}</label>
      <pre className="side-panel-readonly side-panel-pre">{content || "(no content)"}</pre>
    </div>
  );
}
