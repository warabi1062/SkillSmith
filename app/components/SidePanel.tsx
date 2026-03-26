export interface AgentConfigFields {
  model: string;
  tools: string;
  agentContent: string;
}

export interface TeammateFields {
  name: string;
  role: string;
  steps: { id: string; title: string; body: string }[];
  pollingTarget?: string;
  statusCheckResponder?: boolean;
}

export interface SidePanelProps {
  componentType: "SKILL" | "ORCHESTRATOR";
  name: string;
  description: string | null;
  content: string;
  input: string;
  output: string;
  skillType: string | null;
  allowedTools: string | null;
  argumentHint: string | null;
  hasAgentConfig: boolean;
  agentConfig: AgentConfigFields | null;
  teammates: TeammateFields[] | null;
  onClose: () => void;
}

export default function SidePanel({
  componentType,
  name,
  description,
  content,
  input,
  output,
  skillType,
  allowedTools,
  argumentHint,
  hasAgentConfig,
  agentConfig,
  teammates,
  onClose,
}: SidePanelProps) {
  // コンポーネント種別に応じたバッジラベル
  const badgeLabel = componentType === "ORCHESTRATOR" ? "ORCHESTRATOR" : "SKILL";

  // AgentConfigセクションの表示条件: WORKER_WITH_SUB_AGENT の場合のみ
  const showAgentConfigSection =
    componentType === "SKILL" && skillType === "WORKER_WITH_SUB_AGENT" && hasAgentConfig;

  // Teammatesセクションの表示条件: WORKER_WITH_AGENT_TEAM の場合のみ
  const showTeammatesSection =
    componentType === "SKILL" && skillType === "WORKER_WITH_AGENT_TEAM" && teammates && teammates.length > 0;

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
        {/* 名前 */}
        <div className="form-group">
          <label>Name</label>
          <div className="side-panel-readonly">{name}</div>
        </div>

        {/* 説明 */}
        <div className="form-group">
          <label>Description</label>
          <div className="side-panel-readonly">{description || "(no description)"}</div>
        </div>

        {/* Skill Type */}
        {skillType && (
          <div className="form-group">
            <label>Skill Type</label>
            <div className="side-panel-readonly">{skillType}</div>
          </div>
        )}

        {/* Allowed Tools */}
        {allowedTools && (
          <div className="form-group">
            <label>Allowed Tools</label>
            <div className="side-panel-readonly">{allowedTools}</div>
          </div>
        )}

        {/* Argument Hint（ENTRY_POINTのみ表示） */}
        {componentType === "ORCHESTRATOR" && argumentHint && (
          <div className="form-group">
            <label>Argument Hint</label>
            <div className="side-panel-readonly">{argumentHint}</div>
          </div>
        )}

        {/* 本文 */}
        <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <label>Content</label>
          <pre className="side-panel-readonly side-panel-pre">{content || "(no content)"}</pre>
        </div>

        {/* 入力 */}
        {input && (
          <div className="form-group">
            <label>Input</label>
            <div className="side-panel-readonly">{input}</div>
          </div>
        )}

        {/* 出力 */}
        {output && (
          <div className="form-group">
            <label>Output</label>
            <div className="side-panel-readonly">{output}</div>
          </div>
        )}

        {/* AgentConfig表示セクション（WORKER_WITH_SUB_AGENT + agentConfig有りのみ） */}
        {showAgentConfigSection && agentConfig && (
          <div className="side-panel-agent-config-section">
            <div className="side-panel-agent-config-header">
              <h4>Agent Config</h4>
            </div>

            <div className="form-group">
              <label>Model</label>
              <div className="side-panel-readonly">{agentConfig.model || "(not set)"}</div>
            </div>

            <div className="form-group">
              <label>Tools</label>
              <div className="side-panel-readonly">{agentConfig.tools || "(not set)"}</div>
            </div>

            <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label>Agent Content</label>
              <pre className="side-panel-readonly side-panel-pre">
                {agentConfig.agentContent || "(no content)"}
              </pre>
            </div>
          </div>
        )}

        {/* Teammates表示セクション（WORKER_WITH_AGENT_TEAM + teammates有りのみ） */}
        {showTeammatesSection && teammates && (
          <div className="side-panel-teammates-section">
            <div className="side-panel-teammates-header">
              <h4>Teammates</h4>
            </div>
            {teammates.map((mate) => (
              <details key={mate.name} className="side-panel-teammate">
                <summary className="side-panel-teammate-summary">
                  <span className="side-panel-teammate-name">{mate.name}</span>
                  <span className="side-panel-teammate-role">{mate.role}</span>
                </summary>
                <div className="side-panel-teammate-details">
                  {mate.pollingTarget && (
                    <div className="side-panel-teammate-meta">
                      polling → {mate.pollingTarget}
                    </div>
                  )}
                  {mate.statusCheckResponder && (
                    <div className="side-panel-teammate-meta">
                      status_check responder
                    </div>
                  )}
                  <div className="side-panel-teammate-steps">
                    {mate.steps.map((step) => (
                      <details key={step.id} className="side-panel-teammate-step">
                        <summary className="side-panel-teammate-step-summary">
                          {step.id}. {step.title}
                        </summary>
                        <pre className="side-panel-teammate-step-body">{step.body}</pre>
                      </details>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
