// ツールタグの一覧表示
interface ToolTagListProps {
  label?: string;
  tools: string[];
}

export default function ToolTagList({ label, tools }: ToolTagListProps) {
  if (tools.length === 0) return null;

  return (
    <div className="side-panel-inline-tools">
      {label && <span className="side-panel-inline-tools-label">{label}</span>}
      {tools.map((tool) => (
        <span key={tool} className="side-panel-agent-tool-tag">{tool}</span>
      ))}
    </div>
  );
}
