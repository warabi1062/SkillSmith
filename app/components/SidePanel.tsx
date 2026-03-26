import type { SectionPosition, CommunicationPattern } from "../lib/types/skill";

// AgentConfigのセクション（構造化表示用）
export interface AgentConfigSectionFields {
  heading: string;
  body: string;
  position: SectionPosition;
}

export interface AgentConfigFields {
  model: string;
  tools: string[];
  agentContent: string;
  description?: string;
  sections?: AgentConfigSectionFields[];
}

// Workerのステップ（構造化表示用）
export interface WorkerStepFields {
  id: string;
  title: string;
  body: string;
}

export interface TeammateFields {
  name: string;
  role: string;
  steps: { id: string; title: string; body: string }[];
  communicationPattern?: CommunicationPattern;
}

// インラインステップのサブステップ（構造化表示用）
export interface InlineSubStepFields {
  id: string;
  title: string;
  body: string;
}

// オーケストレーターのステップ（再帰構造をフラットに展開済み）
export interface StepFields {
  type: "skill" | "inline" | "branch";
  label: string;
  description?: string;           // branch の判定条件説明用
  cases?: { name: string; steps: StepFields[] }[];
  inlineSteps?: InlineSubStepFields[];
  inlineTools?: string[];
}

// オーケストレーターのセクション
export interface SectionFields {
  heading: string;
  body: string;
  position: SectionPosition;
}

// セクションのpositionを解析するヘルパー
function parseStepPosition(position: string): { type: "before-step" | "after-step"; index: number } | null {
  const match = position.match(/^(before-step|after-step):(\d+)$/);
  if (!match) return null;
  return { type: match[1] as "before-step" | "after-step", index: Number(match[2]) };
}

// 指定位置のセクションを表示するヘルパー
function SectionItems({ sections }: { sections: SectionFields[] }) {
  return (
    <>
      {sections.map(s => (
        <details key={s.heading} className="side-panel-orch-section" open>
          <summary className="side-panel-orch-section-summary">{s.heading}</summary>
          <pre className="side-panel-orch-section-body">{s.body}</pre>
        </details>
      ))}
    </>
  );
}

// 指定indexのbefore-step/after-stepセクションを取得するヘルパー
function getStepSections(sections: SectionFields[] | null | undefined, type: "before-step" | "after-step", index: number): SectionFields[] {
  return sections?.filter(s => {
    const parsed = parseStepPosition(s.position);
    return parsed?.type === type && parsed.index === index;
  }) ?? [];
}

// 範囲外indexのstep間セクションを取得するヘルパー
function getOutOfRangeSections(sections: SectionFields[] | null | undefined, stepCount: number): SectionFields[] {
  return sections?.filter(s => {
    const parsed = parseStepPosition(s.position);
    if (!parsed) return false;
    return parsed.index < 0 || parsed.index >= stepCount;
  }) ?? [];
}

export interface SidePanelProps {
  componentType: "SKILL" | "ORCHESTRATOR" | "INLINE";
  name: string;
  description: string | null;
  content: string;
  input: string;
  output: string;
  skillType: string | null;
  allowedTools: string | null;
  argumentHint: string | null;
  hasAgentConfig: boolean;
  inlineSteps: InlineSubStepFields[] | null;
  inlineTools: string[] | null;
  agentConfig: AgentConfigFields | null;
  teammates: TeammateFields[] | null;
  workerSteps: WorkerStepFields[] | null;
  workerSections: SectionFields[] | null;
  steps: StepFields[] | null;
  sections: SectionFields[] | null;
  onClose: () => void;
}

// ステップの再帰的表示コンポーネント
function StepItem({ step, index }: { step: StepFields; index: number }) {
  if (step.type === "branch") {
    return (
      <details className="side-panel-orch-step" open>
        <summary className="side-panel-orch-step-summary side-panel-orch-step--branch">
          {index}. {step.label}
        </summary>
        <div className="side-panel-orch-step-content">
          {step.description && (
            <pre className="side-panel-orch-step-desc">{step.description}</pre>
          )}
          {step.cases?.map((c) => (
            <div key={c.name} className="side-panel-orch-case">
              <div className="side-panel-orch-case-label">{c.name}</div>
              <div className="side-panel-orch-case-steps">
                {c.steps.map((s, i) => (
                  <StepItem key={`${s.label}-${i}`} step={s} index={i + 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    );
  }

  if (step.type === "inline") {
    return (
      <details className="side-panel-orch-step" open>
        <summary className="side-panel-orch-step-summary side-panel-orch-step--inline">
          <span className="side-panel-orch-step-type">INLINE</span>
          {index}. {step.label}
        </summary>
        <div className="side-panel-orch-step-content">
          {step.inlineTools && step.inlineTools.length > 0 && (
            <div className="side-panel-inline-tools">
              <span className="side-panel-inline-tools-label">Tools:</span>
              {step.inlineTools.map((tool) => (
                <span key={tool} className="side-panel-agent-tool-tag">{tool}</span>
              ))}
            </div>
          )}
          {step.inlineSteps && step.inlineSteps.length > 0 && (
            <div className="side-panel-inline-substeps">
              {step.inlineSteps.map((subStep) => (
                <details key={subStep.id} className="side-panel-teammate-step">
                  <summary className="side-panel-teammate-step-summary">
                    {subStep.id}. {subStep.title}
                  </summary>
                  <pre className="side-panel-teammate-step-body">{subStep.body}</pre>
                </details>
              ))}
            </div>
          )}
        </div>
      </details>
    );
  }

  return (
    <details className="side-panel-orch-step" open>
      <summary className="side-panel-orch-step-summary side-panel-orch-step--skill">
        <span className="side-panel-orch-step-type">SKILL</span>
        {index}. {step.label}
      </summary>
    </details>
  );
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
  inlineSteps,
  inlineTools,
  agentConfig,
  teammates,
  workerSteps,
  workerSections,
  steps,
  sections,
  onClose,
}: SidePanelProps) {
  // コンポーネント種別に応じたバッジラベル
  const badgeLabel = componentType === "ORCHESTRATOR" ? "ORCHESTRATOR"
    : componentType === "INLINE" ? "INLINE STEP"
    : "SKILL";

  // AgentConfigセクションの表示条件: WORKER_WITH_SUB_AGENT の場合のみ
  const showAgentConfigSection =
    componentType === "SKILL" && skillType === "WORKER_WITH_SUB_AGENT" && hasAgentConfig;

  // WorkerStepsセクションの表示条件: WORKER_WITH_SUB_AGENT + workerSteps有りのみ
  const showWorkerStepsSection =
    componentType === "SKILL" && skillType === "WORKER_WITH_SUB_AGENT" && workerSteps && workerSteps.length > 0;

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

        {/* オーケストレーターの構造表示 */}
        {componentType === "ORCHESTRATOR" && steps && steps.length > 0 ? (
          <div className="side-panel-orch-structure">
            {/* before-steps セクション */}
            <SectionItems sections={sections?.filter(s => s.position === "before-steps") ?? []} />

            <label>Steps</label>
            <div className="side-panel-orch-steps">
              {steps.map((step, i) => (
                <div key={`${step.label}-${i}`}>
                  <SectionItems sections={getStepSections(sections, "before-step", i)} />
                  <StepItem step={step} index={i + 1} />
                  <SectionItems sections={getStepSections(sections, "after-step", i)} />
                </div>
              ))}
            </div>

            {/* after-steps セクション + 範囲外フォールバック */}
            <SectionItems sections={[
              ...(sections?.filter(s => s.position === "after-steps") ?? []),
              ...getOutOfRangeSections(sections, steps.length),
            ]} />
          </div>
        ) : componentType === "INLINE" && inlineSteps && inlineSteps.length > 0 ? (
          /* インラインステップの構造化表示 */
          <div className="side-panel-orch-structure">
            {inlineTools && inlineTools.length > 0 && (
              <div className="side-panel-inline-tools">
                <span className="side-panel-inline-tools-label">Tools:</span>
                {inlineTools.map((tool) => (
                  <span key={tool} className="side-panel-agent-tool-tag">{tool}</span>
                ))}
              </div>
            )}
            <label>Steps</label>
            <div className="side-panel-orch-steps">
              {inlineSteps.map((subStep) => (
                <details key={subStep.id} className="side-panel-teammate-step" open>
                  <summary className="side-panel-teammate-step-summary">
                    {subStep.id}. {subStep.title}
                  </summary>
                  <pre className="side-panel-teammate-step-body">{subStep.body}</pre>
                </details>
              ))}
            </div>
          </div>
        ) : showWorkerStepsSection && workerSteps ? (
          /* WorkerWithSubAgent の構造化表示 */
          <div className="side-panel-orch-structure">
            {/* before-steps セクション */}
            <SectionItems sections={workerSections?.filter(s => s.position === "before-steps") ?? []} />

            <label>Worker Steps</label>
            <div className="side-panel-orch-steps">
              {workerSteps.map((step, i) => (
                <div key={step.id}>
                  <SectionItems sections={getStepSections(workerSections, "before-step", i)} />
                  <details className="side-panel-teammate-step" open>
                    <summary className="side-panel-teammate-step-summary">
                      {step.id}. {step.title}
                    </summary>
                    <pre className="side-panel-teammate-step-body">{step.body}</pre>
                  </details>
                  <SectionItems sections={getStepSections(workerSections, "after-step", i)} />
                </div>
              ))}
            </div>

            {/* after-steps セクション + 範囲外フォールバック */}
            <SectionItems sections={[
              ...(workerSections?.filter(s => s.position === "after-steps") ?? []),
              ...getOutOfRangeSections(workerSections, workerSteps.length),
            ]} />
          </div>
        ) : (
          /* 本文（非オーケストレーター or steps がない場合） */
          <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <label>Content</label>
            <pre className="side-panel-readonly side-panel-pre">{content || "(no content)"}</pre>
          </div>
        )}

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
              <div className="side-panel-agent-model">
                <span className="side-panel-agent-model-badge">
                  {agentConfig.model || "(not set)"}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Tools</label>
              <div className="side-panel-agent-tools">
                {agentConfig.tools.length > 0 ? agentConfig.tools.map((tool) => (
                  <span key={tool} className="side-panel-agent-tool-tag">{tool}</span>
                )) : "(not set)"}
              </div>
            </div>

            {agentConfig.description || (agentConfig.sections && agentConfig.sections.length > 0) ? (
              <div className="side-panel-orch-structure">
                {agentConfig.description && (
                  <div className="form-group">
                    <label>Agent Description</label>
                    <div className="side-panel-readonly">{agentConfig.description}</div>
                  </div>
                )}
                <SectionItems sections={agentConfig.sections?.filter(s =>
                  s.position === "before-steps" || s.position.startsWith("before-step:")
                ) ?? []} />
                <SectionItems sections={agentConfig.sections?.filter(s =>
                  s.position === "after-steps" || s.position.startsWith("after-step:")
                ) ?? []} />
              </div>
            ) : (
              <div className="form-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <label>Agent Content</label>
                <pre className="side-panel-readonly side-panel-pre">
                  {agentConfig.agentContent || "(no content)"}
                </pre>
              </div>
            )}
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
                  {mate.communicationPattern?.type === "poller" && (
                    <div className="side-panel-teammate-meta">
                      polling → {mate.communicationPattern.target}
                    </div>
                  )}
                  {mate.communicationPattern?.type === "responder" && (
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
