import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

interface SkillNodeData {
  label: string;
  description: string | null;
  componentType: "SKILL";
  skillType: string | null;
  hasAgentConfig: boolean;
  [key: string]: unknown;
}

// skillTypeに応じたバッジラベルを返す
function getSkillTypeBadge(skillType: string | null): string | null {
  switch (skillType) {
    case "WORKER":
      return "WORKER";
    case "WORKER_WITH_SUB_AGENT":
      return "WORKER + AGENT";
    case "WORKER_WITH_AGENT_TEAM":
      return "WORKER + TEAM";
    default:
      return skillType;
  }
}

export default function SkillNode({
  data,
}: NodeProps & { data: SkillNodeData }) {
  const { label, description, skillType } = data as SkillNodeData;

  const badgeLabel = getSkillTypeBadge(skillType);

  // skillTypeに応じたCSS修飾クラスを返す
  const typeClass = skillType === "WORKER_WITH_SUB_AGENT"
    ? "skill-node--sub-agent"
    : skillType === "WORKER_WITH_AGENT_TEAM"
      ? "skill-node--agent-team"
      : "skill-node--worker";

  return (
    <div className={`skill-node ${typeClass}`}>
      <Handle type="target" position={Position.Left} />
      <div className="skill-node-header">
        <span className="skill-node-badge">SKILL</span>
        {badgeLabel && (
          <span className="skill-node-skill-type">{badgeLabel}</span>
        )}
      </div>
      <div className="skill-node-title">{label || "(unnamed)"}</div>
      <div
        className={`skill-node-description${!description ? " skill-node-description-empty" : ""}`}
      >
        {description || "(no description)"}
      </div>
    </div>
  );
}
