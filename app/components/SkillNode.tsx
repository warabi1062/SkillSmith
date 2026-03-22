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

// sourceハンドルを表示すべきかどうか（ENTRY_POINTのみ非表示にする必要はなく、
// WORKER系でも他のWORKERへの依存が可能なため、ENTRY_POINT以外にはハンドルを表示しない仕様を維持）
function shouldShowSourceHandle(skillType: string | null): boolean {
  // SkillNode はWORKER系のみなので、sourceハンドルは表示しない
  // （ENTRY_POINTはOrchestratorNodeで表示される）
  return false;
}

export default function SkillNode({
  data,
}: NodeProps & { data: SkillNodeData }) {
  const { label, description, skillType } = data as SkillNodeData;

  const badgeLabel = getSkillTypeBadge(skillType);

  return (
    <div className="skill-node">
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
      {shouldShowSourceHandle(skillType) && (
        <Handle type="source" position={Position.Right} />
      )}
    </div>
  );
}
