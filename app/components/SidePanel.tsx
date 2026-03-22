import { useState, useEffect, useRef } from "react";

export interface SidePanelProps {
  nodeId: string;
  nodeType: "component" | "agentTeam";
  componentType: "SKILL" | "AGENT" | "ORCHESTRATOR" | "AGENT_TEAM";
  name: string;
  description: string | null;
  content: string;
  skillType: string | null;
  orchestratorName: string | null;
  onUpdateComponent: (
    componentId: string,
    fields: { name: string; description: string; content: string; skillType?: string },
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
  content,
  skillType,
  orchestratorName,
  onUpdateComponent,
  onUpdateAgentTeam,
  onClose,
}: SidePanelProps) {
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editContent, setEditContent] = useState(content ?? "");

  // 前回のノードID・編集値・種別情報をrefで保持（ノード切り替え時の自動保存用）
  const prevNodeIdRef = useRef(nodeId);
  const prevEditNameRef = useRef(editName);
  const prevEditDescriptionRef = useRef(editDescription);
  const prevEditContentRef = useRef(editContent);
  const prevNodeTypeRef = useRef(nodeType);
  const prevSkillTypeRef = useRef(skillType);

  // editName/editDescription/editContentの変更をrefに反映
  useEffect(() => {
    prevEditNameRef.current = editName;
  }, [editName]);
  useEffect(() => {
    prevEditDescriptionRef.current = editDescription;
  }, [editDescription]);
  useEffect(() => {
    prevEditContentRef.current = editContent;
  }, [editContent]);

  // propsが変わったら（別ノード選択時）フォーム値をリセット
  // ノード切り替え時は前の編集値を自動保存してからリセット
  useEffect(() => {
    if (prevNodeIdRef.current !== nodeId) {
      // 前のノードの編集値が変更されていれば自動保存
      const prevName = prevEditNameRef.current;
      const prevDesc = prevEditDescriptionRef.current;
      if (prevName.trim() !== "") {
        if (prevNodeTypeRef.current === "agentTeam") {
          onUpdateAgentTeam(prevNodeIdRef.current, {
            name: prevName,
            description: prevDesc,
          });
        } else {
          onUpdateComponent(prevNodeIdRef.current, {
            name: prevName,
            description: prevDesc,
            content: prevEditContentRef.current,
            skillType: prevSkillTypeRef.current ?? undefined,
          });
        }
      }
      // refを新しいノードの情報に更新
      prevNodeIdRef.current = nodeId;
      prevNodeTypeRef.current = nodeType;
      prevSkillTypeRef.current = skillType;
    }
    setEditName(name);
    setEditDescription(description ?? "");
    setEditContent(content ?? "");
  }, [nodeId, name, description, content, nodeType, skillType, onUpdateComponent, onUpdateAgentTeam]);

  const handleSave = () => {
    // 空文字の名前は保存しない
    if (editName.trim() === "") return;
    if (nodeType === "agentTeam") {
      onUpdateAgentTeam(nodeId, {
        name: editName,
        description: editDescription,
      });
    } else {
      onUpdateComponent(nodeId, {
        name: editName,
        description: editDescription,
        content: editContent,
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

        {/* 本文フィールド（AGENT_TEAMには非表示） */}
        {componentType !== "AGENT_TEAM" && (
          <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <label htmlFor="side-panel-content">Content</label>
            <textarea
              id="side-panel-content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{ flex: 1 }}
              placeholder="Write content in Markdown..."
            />
          </div>
        )}

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
