import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface SkillNodeData {
  label: string;
  description: string | null;
  componentType: "SKILL";
  skillType: string | null;
  hasAgentConfig: boolean;
  componentId: string;
  pluginId: string;
  [key: string]: unknown;
}

export default function SkillNode({
  data,
}: NodeProps & { data: SkillNodeData }) {
  const { label, description, skillType, hasAgentConfig } = data as SkillNodeData;

  return (
    <div className="skill-node">
      <Handle type="target" position={Position.Left} />
      <div className="skill-node-header">
        <span className="skill-node-badge">SKILL</span>
        {skillType && (
          <span className="skill-node-skill-type">{skillType}</span>
        )}
        {hasAgentConfig && (
          <span className="skill-node-agent-badge">+ AGENT</span>
        )}
      </div>
      <div className="skill-node-title">{label || "(unnamed)"}</div>
      <div
        className={`skill-node-description${!description ? " skill-node-description-empty" : ""}`}
      >
        {description || "(no description)"}
      </div>
      {skillType !== "WORKER" && (
        <Handle type="source" position={Position.Right} />
      )}
    </div>
  );
}
