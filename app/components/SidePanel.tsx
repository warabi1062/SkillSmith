import { useState, useEffect, useRef } from "react";

export interface AgentConfigFields {
  model: string;
  tools: string;
  disallowedTools: string;
  permissionMode: string;
  hooks: string;
  memory: string;
  agentContent: string;
}

export interface SidePanelProps {
  nodeId: string;
  nodeType: "component";
  componentType: "SKILL" | "ORCHESTRATOR";
  name: string;
  description: string | null;
  content: string;
  input: string;
  output: string;
  skillType: string | null;
  hasAgentConfig: boolean;
  agentConfig: AgentConfigFields | null;
  orchestratorName: string | null;
  onUpdateComponent: (
    componentId: string,
    fields: {
      name: string;
      description: string;
      content: string;
      input: string;
      output: string;
      skillType?: string;
      agentConfig?: AgentConfigFields;
    },
  ) => void;
  onClose: () => void;
}

// skillTypeのチェックボックスオプション（排他的）
const SKILL_TYPE_OPTIONS = [
  { flag: "subAgent", skillType: "WORKER_WITH_SUB_AGENT", label: "Sub Agent" },
  { flag: "agentTeam", skillType: "WORKER_WITH_AGENT_TEAM", label: "Agent Team" },
] as const;

export default function SidePanel({
  nodeId,
  nodeType,
  componentType,
  name,
  description,
  content,
  input,
  output,
  skillType,
  hasAgentConfig,
  agentConfig,
  onUpdateComponent,
  onClose,
}: SidePanelProps) {
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editContent, setEditContent] = useState(content ?? "");
  const [editInput, setEditInput] = useState(input ?? "");
  const [editOutput, setEditOutput] = useState(output ?? "");
  const [editSkillType, setEditSkillType] = useState(skillType ?? "");

  // AgentConfig編集状態
  const [editAgentModel, setEditAgentModel] = useState(agentConfig?.model ?? "");
  const [editAgentTools, setEditAgentTools] = useState(agentConfig?.tools ?? "");
  const [editAgentDisallowedTools, setEditAgentDisallowedTools] = useState(agentConfig?.disallowedTools ?? "");
  const [editAgentPermissionMode, setEditAgentPermissionMode] = useState(agentConfig?.permissionMode ?? "");
  const [editAgentHooks, setEditAgentHooks] = useState(agentConfig?.hooks ?? "");
  const [editAgentMemory, setEditAgentMemory] = useState(agentConfig?.memory ?? "");
  const [editAgentContent, setEditAgentContent] = useState(agentConfig?.agentContent ?? "");

  // 前回のノードID・編集値・種別情報をrefで保持（ノード切り替え時の自動保存用）
  const prevNodeIdRef = useRef(nodeId);
  const prevEditNameRef = useRef(editName);
  const prevEditDescriptionRef = useRef(editDescription);
  const prevEditContentRef = useRef(editContent);
  const prevEditInputRef = useRef(editInput);
  const prevEditOutputRef = useRef(editOutput);
  const prevSkillTypeRef = useRef(skillType);
  const prevEditSkillTypeRef = useRef(editSkillType);
  const prevHasAgentConfigRef = useRef(hasAgentConfig);
  const prevEditAgentModelRef = useRef(editAgentModel);
  const prevEditAgentToolsRef = useRef(editAgentTools);
  const prevEditAgentDisallowedToolsRef = useRef(editAgentDisallowedTools);
  const prevEditAgentPermissionModeRef = useRef(editAgentPermissionMode);
  const prevEditAgentHooksRef = useRef(editAgentHooks);
  const prevEditAgentMemoryRef = useRef(editAgentMemory);
  const prevEditAgentContentRef = useRef(editAgentContent);

  // editName/editDescription/editContentの変更をrefに反映
  useEffect(() => { prevEditNameRef.current = editName; }, [editName]);
  useEffect(() => { prevEditDescriptionRef.current = editDescription; }, [editDescription]);
  useEffect(() => { prevEditContentRef.current = editContent; }, [editContent]);
  useEffect(() => { prevEditInputRef.current = editInput; }, [editInput]);
  useEffect(() => { prevEditOutputRef.current = editOutput; }, [editOutput]);
  useEffect(() => { prevEditSkillTypeRef.current = editSkillType; }, [editSkillType]);
  useEffect(() => { prevEditAgentModelRef.current = editAgentModel; }, [editAgentModel]);
  useEffect(() => { prevEditAgentToolsRef.current = editAgentTools; }, [editAgentTools]);
  useEffect(() => { prevEditAgentDisallowedToolsRef.current = editAgentDisallowedTools; }, [editAgentDisallowedTools]);
  useEffect(() => { prevEditAgentPermissionModeRef.current = editAgentPermissionMode; }, [editAgentPermissionMode]);
  useEffect(() => { prevEditAgentHooksRef.current = editAgentHooks; }, [editAgentHooks]);
  useEffect(() => { prevEditAgentMemoryRef.current = editAgentMemory; }, [editAgentMemory]);
  useEffect(() => { prevEditAgentContentRef.current = editAgentContent; }, [editAgentContent]);

  // propsが変わったら（別ノード選択時）フォーム値をリセット
  // ノード切り替え時は前の編集値を自動保存してからリセット
  useEffect(() => {
    if (prevNodeIdRef.current !== nodeId) {
      // 前のノードの編集値が変更されていれば自動保存
      const prevName = prevEditNameRef.current;
      const prevDesc = prevEditDescriptionRef.current;
      if (prevName.trim() !== "") {
        const updateFields: Parameters<typeof onUpdateComponent>[1] = {
          name: prevName,
          description: prevDesc,
          content: prevEditContentRef.current,
          input: prevEditInputRef.current,
          output: prevEditOutputRef.current,
          skillType: prevEditSkillTypeRef.current || (prevSkillTypeRef.current ?? undefined),
        };
        if (prevHasAgentConfigRef.current) {
          updateFields.agentConfig = {
            model: prevEditAgentModelRef.current,
            tools: prevEditAgentToolsRef.current,
            disallowedTools: prevEditAgentDisallowedToolsRef.current,
            permissionMode: prevEditAgentPermissionModeRef.current,
            hooks: prevEditAgentHooksRef.current,
            memory: prevEditAgentMemoryRef.current,
            agentContent: prevEditAgentContentRef.current,
          };
        }
        onUpdateComponent(prevNodeIdRef.current, updateFields);
      }
      // refを新しいノードの情報に更新
      prevNodeIdRef.current = nodeId;
      prevSkillTypeRef.current = skillType;
      prevHasAgentConfigRef.current = hasAgentConfig;
    }
    setEditName(name);
    setEditDescription(description ?? "");
    setEditContent(content ?? "");
    setEditInput(input ?? "");
    setEditOutput(output ?? "");
    setEditSkillType(skillType ?? "");
    setEditAgentModel(agentConfig?.model ?? "");
    setEditAgentTools(agentConfig?.tools ?? "");
    setEditAgentDisallowedTools(agentConfig?.disallowedTools ?? "");
    setEditAgentPermissionMode(agentConfig?.permissionMode ?? "");
    setEditAgentHooks(agentConfig?.hooks ?? "");
    setEditAgentMemory(agentConfig?.memory ?? "");
    setEditAgentContent(agentConfig?.agentContent ?? "");
  }, [nodeId, name, description, content, input, output, nodeType, skillType, hasAgentConfig, agentConfig, onUpdateComponent]);

  const handleSave = () => {
    // 空文字の名前は保存しない
    if (editName.trim() === "") return;
    const updateFields: Parameters<typeof onUpdateComponent>[1] = {
      name: editName,
      description: editDescription,
      content: editContent,
      input: editInput,
      output: editOutput,
      skillType: editSkillType || (skillType ?? undefined),
    };
    if (hasAgentConfig) {
      updateFields.agentConfig = {
        model: editAgentModel,
        tools: editAgentTools,
        disallowedTools: editAgentDisallowedTools,
        permissionMode: editAgentPermissionMode,
        hooks: editAgentHooks,
        memory: editAgentMemory,
        agentContent: editAgentContent,
      };
    }
    onUpdateComponent(nodeId, updateFields);
  };

  // コンポーネント種別に応じたバッジラベル
  const badgeLabel = componentType === "ORCHESTRATOR" ? "ORCHESTRATOR" : "SKILL";

  // AgentConfig編集セクションの表示条件: editSkillTypeで即時反映
  const showAgentConfigSection =
    componentType === "SKILL" && editSkillType === "WORKER_WITH_SUB_AGENT";

  // skillType変更UIの表示条件: ENTRY_POINTでない場合のみ
  const showSkillTypeSelect = componentType !== "ORCHESTRATOR";

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

        {/* 本文フィールド */}
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

        {/* 入力フィールド */}
        <div className="form-group">
          <label htmlFor="side-panel-input">Input</label>
          <textarea
            id="side-panel-input"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            rows={3}
            placeholder="Describe input..."
          />
        </div>

        {/* 出力フィールド */}
        <div className="form-group">
          <label htmlFor="side-panel-output">Output</label>
          <textarea
            id="side-panel-output"
            value={editOutput}
            onChange={(e) => setEditOutput(e.target.value)}
            rows={3}
            placeholder="Describe output..."
          />
        </div>

        {/* skillTypeオプション（ENTRY_POINTの場合は非表示） */}
        {showSkillTypeSelect && (
          <div className="form-group">
            <label>Options</label>
            <div className="side-panel-checkboxes">
              {SKILL_TYPE_OPTIONS.map((opt) => (
                <label key={opt.flag} className="side-panel-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editSkillType === opt.skillType}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditSkillType(opt.skillType);
                      } else {
                        setEditSkillType("WORKER");
                      }
                    }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ENTRY_POINTの場合はskillType読み取り専用表示 */}
        {!showSkillTypeSelect && skillType && (
          <div className="form-group">
            <label>Skill Type</label>
            <div className="side-panel-readonly">{skillType}</div>
          </div>
        )}

        {/* AgentConfig編集セクション（WORKER_WITH_SUB_AGENT + agentConfig有りのみ） */}
        {showAgentConfigSection && (
          <div className="side-panel-agent-config-section">
            <div className="side-panel-agent-config-header">
              <h4>Agent Config</h4>
            </div>

            <div className="form-group">
              <label htmlFor="side-panel-agent-model">Model</label>
              <input
                id="side-panel-agent-model"
                type="text"
                value={editAgentModel}
                onChange={(e) => setEditAgentModel(e.target.value)}
                placeholder="e.g. sonnet"
              />
            </div>

            <div className="form-group">
              <label htmlFor="side-panel-agent-tools">Tools</label>
              <textarea
                id="side-panel-agent-tools"
                value={editAgentTools}
                onChange={(e) => setEditAgentTools(e.target.value)}
                rows={2}
                placeholder='e.g. ["Read", "Grep"]'
              />
            </div>

            <div className="form-group">
              <label htmlFor="side-panel-agent-disallowed-tools">Disallowed Tools</label>
              <textarea
                id="side-panel-agent-disallowed-tools"
                value={editAgentDisallowedTools}
                onChange={(e) => setEditAgentDisallowedTools(e.target.value)}
                rows={2}
                placeholder='e.g. ["Bash"]'
              />
            </div>

            <div className="form-group">
              <label htmlFor="side-panel-agent-permission-mode">Permission Mode</label>
              <input
                id="side-panel-agent-permission-mode"
                type="text"
                value={editAgentPermissionMode}
                onChange={(e) => setEditAgentPermissionMode(e.target.value)}
                placeholder="e.g. bypassPermissions"
              />
            </div>

            <div className="form-group">
              <label htmlFor="side-panel-agent-hooks">Hooks</label>
              <textarea
                id="side-panel-agent-hooks"
                value={editAgentHooks}
                onChange={(e) => setEditAgentHooks(e.target.value)}
                rows={2}
                placeholder="Hook configuration..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="side-panel-agent-memory">Memory</label>
              <textarea
                id="side-panel-agent-memory"
                value={editAgentMemory}
                onChange={(e) => setEditAgentMemory(e.target.value)}
                rows={2}
                placeholder="Memory configuration..."
              />
            </div>

            <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label htmlFor="side-panel-agent-content">Agent Content</label>
              <textarea
                id="side-panel-agent-content"
                value={editAgentContent}
                onChange={(e) => setEditAgentContent(e.target.value)}
                style={{ flex: 1 }}
                placeholder="Write agent content in Markdown..."
              />
            </div>
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
