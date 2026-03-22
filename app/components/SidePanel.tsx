import { useState, useEffect, useRef } from "react";

export interface SidePanelProps {
  nodeId: string;
  nodeType: "component" | "agentTeam";
  componentType: "SKILL" | "AGENT" | "ORCHESTRATOR" | "AGENT_TEAM";
  name: string;
  description: string | null;
  skillType: string | null;
  orchestratorName: string | null;
  mainFileId: string | null;
  mainFileContent: string | null;
  onUpdateComponent: (
    componentId: string,
    fields: { name: string; description: string; skillType?: string },
  ) => void;
  onUpdateAgentTeam: (
    teamId: string,
    fields: { name: string; description: string },
  ) => void;
  onUpdateMainFile: (fileId: string, content: string) => void;
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
  mainFileId,
  mainFileContent,
  onUpdateComponent,
  onUpdateAgentTeam,
  onUpdateMainFile,
  onClose,
}: SidePanelProps) {
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editMainContent, setEditMainContent] = useState(mainFileContent ?? "");

  // 前回のノードID・編集値・種別情報をrefで保持（ノード切り替え時の自動保存用）
  const prevNodeIdRef = useRef(nodeId);
  const prevEditNameRef = useRef(editName);
  const prevEditDescriptionRef = useRef(editDescription);
  const prevNodeTypeRef = useRef(nodeType);
  const prevSkillTypeRef = useRef(skillType);
  const prevMainFileIdRef = useRef(mainFileId);
  const prevEditMainContentRef = useRef(editMainContent);

  // editName/editDescription/editMainContentの変更をrefに反映
  useEffect(() => {
    prevEditNameRef.current = editName;
  }, [editName]);
  useEffect(() => {
    prevEditDescriptionRef.current = editDescription;
  }, [editDescription]);
  useEffect(() => {
    prevEditMainContentRef.current = editMainContent;
  }, [editMainContent]);

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
            skillType: prevSkillTypeRef.current ?? undefined,
          });
        }
      }
      // MAINファイルの自動保存
      if (prevMainFileIdRef.current) {
        onUpdateMainFile(prevMainFileIdRef.current, prevEditMainContentRef.current);
      }
      // refを新しいノードの情報に更新
      prevNodeIdRef.current = nodeId;
      prevNodeTypeRef.current = nodeType;
      prevSkillTypeRef.current = skillType;
      prevMainFileIdRef.current = mainFileId;
    }
    setEditName(name);
    setEditDescription(description ?? "");
    setEditMainContent(mainFileContent ?? "");
  }, [nodeId, name, description, nodeType, skillType, mainFileId, mainFileContent, onUpdateComponent, onUpdateAgentTeam, onUpdateMainFile]);

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
        skillType: skillType ?? undefined,
      });
      // MAINファイルの保存
      if (mainFileId) {
        onUpdateMainFile(mainFileId, editMainContent);
      }
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

        {/* 本文（MAINファイル）- AGENT_TEAMは対象外 */}
        {componentType !== "AGENT_TEAM" && mainFileId && (
          <div className="form-group">
            <label htmlFor="side-panel-main-content">Content</label>
            <textarea
              id="side-panel-main-content"
              className="side-panel-main-content"
              value={editMainContent}
              onChange={(e) => setEditMainContent(e.target.value)}
              rows={10}
            />
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
