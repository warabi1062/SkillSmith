import { useState, useEffect } from "react";

export interface SidePanelProps {
  nodeId: string;
  nodeType: "component" | "agentTeam";
  componentType: "SKILL" | "AGENT" | "ORCHESTRATOR" | "AGENT_TEAM";
  name: string;
  description: string | null;
  skillType: string | null;
  orchestratorName: string | null;
  onUpdateComponent: (
    componentId: string,
    fields: { name: string; description: string; skillType?: string },
  ) => void;
  onUpdateAgentTeam: (
    teamId: string,
    fields: { name: string; description: string },
  ) => void;
  onClose: () => void;
}

export default function SidePanel({
  nodeId,
  nodeType,
  componentType,
  name,
  description,
  skillType,
  orchestratorName,
  onUpdateComponent,
  onUpdateAgentTeam,
  onClose,
}: SidePanelProps) {
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(description ?? "");

  // propsが変わったら（別ノード選択時）フォーム値をリセット
  useEffect(() => {
    setEditName(name);
    setEditDescription(description ?? "");
  }, [nodeId, name, description]);

  const handleSave = () => {
    if (nodeType === "agentTeam") {
      onUpdateAgentTeam(nodeId, {
        name: editName,
        description: editDescription,
      });
    } else {
      onUpdateComponent(nodeId, {
        name: editName,
        description: editDescription,
        skillType: skillType ?? undefined,
      });
    }
  };

  // コンポーネント種別に応じたバッジラベル
  const badgeLabel = (() => {
    switch (componentType) {
      case "SKILL":
        return "SKILL";
      case "AGENT":
        return "AGENT";
      case "ORCHESTRATOR":
        return "ORCHESTRATOR";
      case "AGENT_TEAM":
        return "AGENT TEAM";
      default:
        return "";
    }
  })();

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <span className="side-panel-badge">{badgeLabel}</span>
        <button
          type="button"
          className="side-panel-close"
          aria-label="Close"
          onClick={onClose}
        >
          x
        </button>
      </div>

      <div className="side-panel-body">
        {/* 名前フィールド */}
        <div className="form-group">
          <label htmlFor="side-panel-name">Name</label>
          <input
            id="side-panel-name"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>

        {/* 説明フィールド */}
        <div className="form-group">
          <label htmlFor="side-panel-description">Description</label>
          <textarea
            id="side-panel-description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* skillType（読み取り専用、SKILL/ORCHESTRATORのみ） */}
        {skillType && (componentType === "SKILL" || componentType === "ORCHESTRATOR") && (
          <div className="form-group">
            <label>Skill Type</label>
            <div className="side-panel-readonly">{skillType}</div>
          </div>
        )}

        {/* orchestratorName（読み取り専用、AGENT TEAMのみ） */}
        {componentType === "AGENT_TEAM" && orchestratorName && (
          <div className="form-group">
            <label>Orchestrator</label>
            <div className="side-panel-readonly">{orchestratorName}</div>
          </div>
        )}

        {/* 保存ボタン */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
