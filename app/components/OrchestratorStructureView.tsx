import { useState } from "react";
import type { SectionPosition, CommunicationPattern } from "../lib/types/skill";
import { serializeToolRef } from "../lib/types/skill";
import type {
  LoadedSkillUnion,
  LoadedStep,
  LoadedBranch,
  LoadedInlineStep,
  LoadedOrchestratorSection,
} from "../lib/types/loader.server";

// --- 型定義 ---

// AgentConfigのセクション（構造化表示用）
interface AgentConfigSectionFields {
  heading: string;
  body: string;
  position: SectionPosition;
}

interface AgentConfigFields {
  model: string;
  tools: string[];
  agentContent: string;
  description?: string;
  sections?: AgentConfigSectionFields[];
}

// ステップの共通bodyフィールド（body + bodyFile）
interface BodyFields {
  body: string;
  bodyFile?: string;
}

// Workerのステップ（構造化表示用）
interface WorkerStepFields extends BodyFields {
  id: string;
  title: string;
}

interface TeammateFields {
  name: string;
  role: string;
  steps: (WorkerStepFields)[];
  communicationPattern?: CommunicationPattern;
}

// インラインステップのサブステップ（構造化表示用）
interface InlineSubStepFields extends BodyFields {
  id: string;
  title: string;
}

// オーケストレーターのステップ（再帰構造をフラットに展開済み）
export interface StepFields {
  type: "skill" | "inline" | "branch";
  label: string;
  description?: string;
  cases?: { name: string; steps: StepFields[] }[];
  inlineSteps?: InlineSubStepFields[];
  inlineTools?: string[];
}

// オーケストレーターのセクション
export interface SectionFields extends BodyFields {
  heading: string;
  position: SectionPosition;
}

// --- データ変換関数 ---

// LoadedStep -> StepFields 変換（型ガードはランタイム判定）
export function convertStep(step: LoadedStep): StepFields {
  if (typeof step === "string") {
    return { type: "skill", label: step };
  }
  if ("decisionPoint" in step && "cases" in step) {
    const branch = step as LoadedBranch;
    return {
      type: "branch",
      label: branch.decisionPoint,
      description: branch.description,
      cases: Object.entries(branch.cases).map(([name, steps]) => ({
        name,
        steps: steps.map(convertStep),
      })),
    };
  }
  const inline = step as LoadedInlineStep;
  return {
    type: "inline",
    label: inline.inline,
    inlineSteps: inline.steps.map(s => ({ id: s.id, title: s.title, body: s.body, bodyFile: s.bodyFile })),
    inlineTools: inline.tools?.map(serializeToolRef),
  };
}

export function convertSections(sections: LoadedOrchestratorSection[]): SectionFields[] {
  return sections.map(s => ({ heading: s.heading, body: s.body, bodyFile: s.bodyFile, position: s.position }));
}

// --- ヘルパー関数 ---

// セクションのpositionを解析するヘルパー
function parseStepPosition(position: string): { type: "before-step" | "after-step"; index: number } | null {
  const match = position.match(/^(before-step|after-step):(\d+)$/);
  if (!match) return null;
  return { type: match[1] as "before-step" | "after-step", index: Number(match[2]) };
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

// --- skill情報の組み立て ---

interface SkillDetailData {
  name: string;
  description: string | null;
  skillType: string;
  content: string;
  input: string;
  output: string;
  allowedTools: string | null;
  steps: StepFields[] | null;
  sections: SectionFields[] | null;
  agentConfig: AgentConfigFields | null;
  workerSteps: WorkerStepFields[] | null;
  workerSections: SectionFields[] | null;
  teammates: TeammateFields[] | null;
}

function buildSkillDetailData(skill: LoadedSkillUnion): SkillDetailData {
  const agentConfigData =
    skill.skillType === "WORKER_WITH_SUB_AGENT" ? skill.agentConfig : null;

  const workerStepsData: WorkerStepFields[] | null =
    skill.skillType === "WORKER_WITH_SUB_AGENT" && skill.workerSteps
      ? skill.workerSteps.map(s => ({ id: s.id, title: s.title, body: s.body, bodyFile: s.bodyFile }))
      : null;

  const workerSectionsData: SectionFields[] | null =
    skill.skillType === "WORKER_WITH_SUB_AGENT" && skill.workerSections
      ? skill.workerSections.map(s => ({ heading: s.heading, body: s.body, bodyFile: s.bodyFile, position: s.position }))
      : null;

  const teammatesData =
    skill.skillType === "WORKER_WITH_AGENT_TEAM" && skill.teammates
      ? skill.teammates.map(t => ({
          name: t.name,
          role: t.role,
          steps: t.steps.map(s => ({ id: s.id, title: s.title, body: s.body, bodyFile: s.bodyFile })),
          communicationPattern: t.communicationPattern,
        }))
      : null;

  return {
    name: skill.name,
    description: skill.description ?? null,
    skillType: skill.skillType,
    content: skill.content ?? "",
    input: skill.input ?? "",
    output: skill.output ?? "",
    allowedTools: skill.allowedTools
      ? JSON.stringify(skill.allowedTools.map(serializeToolRef))
      : null,
    steps: skill.steps ? skill.steps.map(convertStep) : null,
    sections: skill.sections ? convertSections(skill.sections as LoadedOrchestratorSection[]) : null,
    agentConfig: agentConfigData
      ? {
          model: agentConfigData.model ?? "",
          tools: (agentConfigData.tools ?? []).map(serializeToolRef),
          agentContent: agentConfigData.content ?? "",
          description: agentConfigData.description,
          sections: agentConfigData.sections?.map(s => ({
            heading: s.heading,
            body: s.body ?? "",
            position: s.position,
          })),
        }
      : null,
    workerSteps: workerStepsData,
    workerSections: workerSectionsData,
    teammates: teammatesData,
  };
}

// --- 表示コンポーネント ---

// bodyFile の内容をサイドパネルで表示するコンポーネント
function BodyFilePanel({ filename, content, onClose }: { filename: string; content: string; onClose: () => void }) {
  return (
    <div className="ov-sidepanel-overlay" onClick={onClose}>
      <div className="ov-sidepanel" onClick={e => e.stopPropagation()}>
        <div className="ov-sidepanel-header">
          <span className="ov-sidepanel-filename">{filename}</span>
          <button className="ov-sidepanel-close" onClick={onClose}>&times;</button>
        </div>
        <pre className="ov-sidepanel-content">{content}</pre>
      </div>
    </div>
  );
}

// body または bodyFile リンクを表示するコンポーネント
function BodyContent({ body, bodyFile }: BodyFields) {
  const [panelOpen, setPanelOpen] = useState(false);

  if (bodyFile) {
    return (
      <>
        <div
          className="ov-bodyfile-link"
          onClick={() => setPanelOpen(true)}
        >
          {bodyFile}
        </div>
        {panelOpen && (
          <BodyFilePanel
            filename={bodyFile}
            content={body}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </>
    );
  }

  if (!body) return null;
  return <pre className="ov-substep-body">{body}</pre>;
}

// セクション一覧の表示
function SectionItems({ sections }: { sections: SectionFields[] }) {
  return (
    <>
      {sections.map(s => (
        <div key={s.heading} className="ov-section">
          <div className="ov-section-heading">{s.heading}</div>
          <BodyContent body={s.body} bodyFile={s.bodyFile} />
        </div>
      ))}
    </>
  );
}

// ステップの再帰的表示コンポーネント
function StepItem({ step, index }: { step: StepFields; index: number }) {
  if (step.type === "branch") {
    return (
      <div className="ov-step">
        <div className="ov-step-header ov-step--branch">
          {index}. {step.label}
        </div>
        <div className="ov-step-content">
          {step.description && (
            <pre className="ov-step-desc">{step.description}</pre>
          )}
          {step.cases?.map((c) => (
            <div key={c.name} className="ov-case">
              <div className="ov-case-label">{c.name}</div>
              <div className="ov-case-steps">
                {c.steps.map((s, i) => (
                  <StepItem key={`${s.label}-${i}`} step={s} index={i + 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step.type === "inline") {
    return (
      <div className="ov-step">
        <div className="ov-step-header ov-step--inline">
          <span className="ov-step-type">INLINE</span>
          {index}. {step.label}
        </div>
        <div className="ov-step-content">
          {step.inlineTools && step.inlineTools.length > 0 && (
            <div className="ov-inline-tools">
              <span className="ov-inline-tools-label">Tools:</span>
              {step.inlineTools.map((tool) => (
                <span key={tool} className="ov-tool-tag">{tool}</span>
              ))}
            </div>
          )}
          {step.inlineSteps && step.inlineSteps.length > 0 && (
            <div className="ov-inline-substeps">
              {step.inlineSteps.map((subStep) => (
                <div key={subStep.id} className="ov-substep">
                  <div className="ov-substep-heading">
                    {subStep.id}. {subStep.title}
                  </div>
                  <BodyContent body={subStep.body} bodyFile={subStep.bodyFile} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ov-step">
      <div className="ov-step-header ov-step--skill">
        <span className="ov-step-type">SKILL</span>
        {index}. {step.label}
      </div>
    </div>
  );
}

// スキル詳細のインライン展開
function SkillDetail({ data, allSkills }: { data: SkillDetailData; allSkills: LoadedSkillUnion[] }) {
  const showAgentConfig = data.skillType === "WORKER_WITH_SUB_AGENT" && data.agentConfig;
  const showWorkerSteps = data.skillType === "WORKER_WITH_SUB_AGENT" && data.workerSteps && data.workerSteps.length > 0;
  const showTeammates = data.skillType === "WORKER_WITH_AGENT_TEAM" && data.teammates && data.teammates.length > 0;

  return (
    <div className="ov-skill-detail">
      {/* 説明 */}
      {data.description && (
        <div className="ov-field">
          <label>Description</label>
          <div className="ov-field-value">{data.description}</div>
        </div>
      )}

      {/* Allowed Tools */}
      {data.allowedTools && (
        <div className="ov-field">
          <label>Allowed Tools</label>
          <div className="ov-field-value">{data.allowedTools}</div>
        </div>
      )}

      {/* 構造表示: workerSteps */}
      {showWorkerSteps && data.workerSteps ? (
        <div className="ov-structure">
          <SectionItems sections={data.workerSections?.filter(s => s.position === "before-steps") ?? []} />
          <label>Worker Steps</label>
          <div className="ov-steps">
            {data.workerSteps.map((step, i) => (
              <div key={step.id}>
                <SectionItems sections={getStepSections(data.workerSections, "before-step", i)} />
                <div className="ov-substep">
                  <div className="ov-substep-heading">
                    {step.id}. {step.title}
                  </div>
                  <BodyContent body={step.body} bodyFile={step.bodyFile} />
                </div>
                <SectionItems sections={getStepSections(data.workerSections, "after-step", i)} />
              </div>
            ))}
          </div>
          <SectionItems sections={[
            ...(data.workerSections?.filter(s => s.position === "after-steps") ?? []),
            ...getOutOfRangeSections(data.workerSections, data.workerSteps.length),
          ]} />
        </div>
      ) : (
        /* 本文（workerStepsがない場合） */
        data.content && (
          <div className="ov-field">
            <label>Content</label>
            <pre className="ov-pre">{data.content}</pre>
          </div>
        )
      )}

      {/* 入力 */}
      {data.input && (
        <div className="ov-field">
          <label>Input</label>
          <div className="ov-field-value">{data.input}</div>
        </div>
      )}

      {/* 出力 */}
      {data.output && (
        <div className="ov-field">
          <label>Output</label>
          <div className="ov-field-value">{data.output}</div>
        </div>
      )}

      {/* AgentConfig */}
      {showAgentConfig && data.agentConfig && (
        <div className="ov-agent-config">
          <h5>Agent Config</h5>
          <div className="ov-field">
            <label>Model</label>
            <span className="ov-model-badge">{data.agentConfig.model || "(not set)"}</span>
          </div>
          <div className="ov-field">
            <label>Tools</label>
            <div className="ov-tools">
              {data.agentConfig.tools.length > 0 ? data.agentConfig.tools.map((tool) => (
                <span key={tool} className="ov-tool-tag">{tool}</span>
              )) : "(not set)"}
            </div>
          </div>
          {data.agentConfig.description || (data.agentConfig.sections && data.agentConfig.sections.length > 0) ? (
            <div className="ov-structure">
              {data.agentConfig.description && (
                <div className="ov-field">
                  <label>Agent Description</label>
                  <div className="ov-field-value">{data.agentConfig.description}</div>
                </div>
              )}
              <SectionItems sections={data.agentConfig.sections?.filter(s =>
                s.position === "before-steps" || s.position.startsWith("before-step:")
              ) ?? []} />
              <SectionItems sections={data.agentConfig.sections?.filter(s =>
                s.position === "after-steps" || s.position.startsWith("after-step:")
              ) ?? []} />
            </div>
          ) : (
            data.agentConfig.agentContent && (
              <div className="ov-field">
                <label>Agent Content</label>
                <pre className="ov-pre">{data.agentConfig.agentContent}</pre>
              </div>
            )
          )}
        </div>
      )}

      {/* Teammates */}
      {showTeammates && data.teammates && (
        <div className="ov-teammates">
          <h5>Teammates</h5>
          {data.teammates.map((mate) => (
            <div key={mate.name} className="ov-teammate">
              <div className="ov-teammate-header">
                <span className="ov-teammate-name">{mate.name}</span>
                <span className="ov-teammate-role">{mate.role}</span>
              </div>
              <div className="ov-teammate-details">
                {mate.communicationPattern?.type === "poller" && (
                  <div className="ov-teammate-meta">
                    polling &rarr; {mate.communicationPattern.target}
                  </div>
                )}
                {mate.communicationPattern?.type === "responder" && (
                  <div className="ov-teammate-meta">
                    status_check responder
                  </div>
                )}
                <div className="ov-teammate-steps">
                  {mate.steps.map((step) => (
                    <div key={step.id} className="ov-substep">
                      <div className="ov-substep-heading">
                        {step.id}. {step.title}
                      </div>
                      <BodyContent body={step.body} bodyFile={step.bodyFile} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// オーケストレーター単体の構造表示
export function OrchestratorView({ skill, allSkills }: { skill: LoadedSkillUnion; allSkills: LoadedSkillUnion[] }) {
  const steps = skill.steps ? skill.steps.map(convertStep) : [];
  const sections = skill.sections ? convertSections(skill.sections as LoadedOrchestratorSection[]) : [];

  return (
    <div className="ov-orchestrator">
      <h4 className="ov-orchestrator-title">{skill.name}</h4>
      {skill.description && (
        <p className="ov-orchestrator-desc">{skill.description}</p>
      )}

      {/* before-steps セクション */}
      <SectionItems sections={sections.filter(s => s.position === "before-steps")} />

      <div className="ov-steps">
        {steps.map((step, i) => {
          // skillステップの場合、参照先のskillを検索してインライン展開
          const referencedSkill = step.type === "skill"
            ? allSkills.find(s => s.name === step.label)
            : null;

          return (
            <div key={`${step.label}-${i}`} className="ov-step-wrapper">
              <SectionItems sections={getStepSections(sections, "before-step", i)} />

              <StepItem step={step} index={i + 1} />

              {/* skillステップの場合、参照先skill詳細をインライン展開 */}
              {referencedSkill && (
                <SkillDetail
                  data={buildSkillDetailData(referencedSkill)}
                  allSkills={allSkills}
                />
              )}

              <SectionItems sections={getStepSections(sections, "after-step", i)} />
            </div>
          );
        })}
      </div>

      {/* after-steps セクション + 範囲外フォールバック */}
      <SectionItems sections={[
        ...sections.filter(s => s.position === "after-steps"),
        ...getOutOfRangeSections(sections, steps.length),
      ]} />
    </div>
  );
}

