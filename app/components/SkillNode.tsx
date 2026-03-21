import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface SkillNodeData {
  label: string;
  description: string | null;
  componentType: "SKILL";
  skillType: string | null;
  [key: string]: unknown;
}

export default function SkillNode({
  data,
}: NodeProps & { data: SkillNodeData }) {
  const { label, description, skillType } = data as SkillNodeData;

  return (
    <div className="skill-node">
      <Handle type="target" position={Position.Top} />
      <div className="skill-node-header">
        <span className="skill-node-badge">SKILL</span>
        {skillType && (
          <span className="skill-node-skill-type">{skillType}</span>
        )}
      </div>
      <div className="skill-node-title">{label}</div>
      {description ? (
        <div className="skill-node-description">{description}</div>
      ) : (
        <div className="skill-node-description skill-node-description-empty">
          (no description)
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
