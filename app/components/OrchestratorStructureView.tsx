import { useState } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
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

// ステップの共通bodyフィールド
interface BodyFields {
  body: string;
  bodyFile?: string;
}

// サポートファイルの内容マップ（filename → content）
type SupportFileMap = Record<string, string>;

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
  supportFiles: SupportFileMap;
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
    supportFiles: Object.fromEntries(
      (skill.files ?? []).map(f => [f.filename, f.content]),
    ),
  };
}

// --- 表示コンポーネント ---

// bodyFile の内容をサイドパネルで表示するコンポーネント（Portalで body 直下にレンダリング）
function BodyFilePanel({ filename, content, onClose }: { filename: string; content: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex justify-end" onClick={onClose}>
      <div className="w-[min(600px,90vw)] h-screen bg-[var(--bg-surface)] border-l border-[var(--border-default)] flex flex-col animate-in slide-in-from-right duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
          <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">{filename}</span>
          <button className="bg-transparent border-none text-2xl text-[var(--text-tertiary)] cursor-pointer px-1 leading-none hover:text-[var(--text-primary)]" onClick={onClose}>&times;</button>
        </div>
        <div className="ov-sidepanel-content flex-1 overflow-y-auto p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          <Markdown>{content}</Markdown>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// body テキスト内をMarkdownレンダリングするコンポーネント
// supportFiles内のファイルへのリンクはクリックでサイドパネルを開く
function BodyContent({ body, supportFiles }: { body: string; supportFiles?: SupportFileMap }) {
  const [openFile, setOpenFile] = useState<string | null>(null);

  if (!body) return null;

  return (
    <>
      <div className="ov-markdown my-1 mx-0 px-3 py-2.5 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-sm font-sans text-[0.8125rem] break-words text-[var(--text-secondary)] leading-relaxed">
        <Markdown
          components={{
            a: ({ href, children }) => {
              const filename = href?.replace(/^\.\//, "") ?? "";
              const fileContent = supportFiles?.[filename];
              if (fileContent !== undefined) {
                return (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 font-mono text-[0.8rem] text-[var(--accent)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-sm cursor-pointer transition-[border-color,background] duration-150 hover:border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] before:content-['📄'] before:text-xs"
                    onClick={() => setOpenFile(filename)}
                  >
                    {children}
                  </span>
                );
              }
              return <a href={href}>{children}</a>;
            },
          }}
        >
          {body}
        </Markdown>
      </div>
      {openFile && supportFiles?.[openFile] !== undefined && (
        <BodyFilePanel
          filename={openFile}
          content={supportFiles[openFile]}
          onClose={() => setOpenFile(null)}
        />
      )}
    </>
  );
}

// セクション一覧の表示
function SectionItems({ sections, supportFiles }: { sections: SectionFields[]; supportFiles?: SupportFileMap }) {
  return (
    <>
      {sections.map(s => (
        <div key={s.heading} className="border border-[var(--border-subtle)] rounded-md mb-1 overflow-hidden">
          <div className="px-3.5 py-2 font-heading text-[0.8125rem] font-medium text-[var(--text-tertiary)] bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">{s.heading}</div>
          <BodyContent body={s.body} supportFiles={supportFiles} />
        </div>
      ))}
    </>
  );
}

// ステップの再帰的表示コンポーネント
function StepItem({ step, index, allSkills }: { step: StepFields; index: number; allSkills: LoadedSkillUnion[] }) {
  if (step.type === "branch") {
    return (
      <div className="border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface)] transition-all duration-150 hover:border-[var(--border-default)]">
        <div className="px-3.5 py-2.5 font-heading text-sm font-semibold text-[var(--accent-blue)] flex items-center gap-2">
          {index}. {step.label}
        </div>
        <div className="px-3.5 pb-3.5">
          {step.description && (
            <div className="ov-markdown my-1 mb-2 px-3 py-2 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-sm font-sans text-[0.8125rem] break-words text-[var(--text-secondary)] leading-relaxed"><Markdown>{step.description}</Markdown></div>
          )}
          {step.cases?.map((c) => (
            <div key={c.name} className="mt-2 ml-4 border-l-2 border-[rgba(78,143,255,0.3)] pl-4">
              <div className="font-heading text-[0.8125rem] font-semibold text-[var(--accent-blue)] mb-1 tracking-[0.01em]">{c.name}</div>
              <div className="flex flex-col gap-1.5">
                {c.steps.map((s, i) => (
                  <StepItem key={`${s.label}-${i}`} step={s} index={i + 1} allSkills={allSkills} />
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
      <div className="border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface)] transition-all duration-150 hover:border-[var(--border-default)]">
        <div className="px-3.5 py-2.5 font-heading text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
          <span className="inline-block px-2 py-px font-mono text-[0.625rem] font-semibold rounded-sm leading-relaxed tracking-[0.05em] uppercase bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-default)]">INLINE</span>
          {index}. {step.label}
        </div>
        <div className="px-3.5 pb-3.5">
          {step.inlineTools && step.inlineTools.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center mb-2">
              <span className="font-heading text-xs font-semibold text-[var(--text-tertiary)] mr-1 uppercase tracking-[0.05em]">Tools:</span>
              {step.inlineTools.map((tool) => (
                <span key={tool} className="inline-block px-2 py-0.5 font-mono text-xs font-medium rounded-sm bg-[var(--accent-violet-dim)] text-[var(--accent-violet)] border border-[rgba(124,92,191,0.2)] transition-[background] duration-150 hover:bg-[rgba(124,92,191,0.12)]">{tool}</span>
              ))}
            </div>
          )}
          {step.inlineSteps && step.inlineSteps.length > 0 && (
            <div>
              {step.inlineSteps.map((subStep) => (
                <div key={subStep.id} className="mb-2">
                  <div className="font-heading text-sm font-medium text-[var(--text-primary)] py-1">
                    {subStep.id}. {subStep.title}
                  </div>
                  <BodyContent body={subStep.body} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // skillステップ: 参照先skillを検索してインライン展開
  const referencedSkill = allSkills.find(s => s.name === step.label) ?? null;

  return (
    <div className="border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface)] transition-all duration-150 hover:border-[var(--border-default)]">
      <div className="px-3.5 py-2.5 font-heading text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
        <span className="inline-block px-2 py-px font-mono text-[0.625rem] font-semibold rounded-sm leading-relaxed tracking-[0.05em] uppercase bg-[var(--accent-amber-dim)] text-[var(--accent-amber)] border border-[rgba(232,160,64,0.25)]">SKILL</span>
        {index}. {step.label}
      </div>
      {referencedSkill && (
        <SkillDetail
          data={buildSkillDetailData(referencedSkill)}
          allSkills={allSkills}
        />
      )}
    </div>
  );
}

// スキル詳細のインライン展開
function SkillDetail({ data, allSkills }: { data: SkillDetailData; allSkills: LoadedSkillUnion[] }) {
  const showAgentConfig = data.skillType === "WORKER_WITH_SUB_AGENT" && data.agentConfig;
  const showWorkerSteps = data.skillType === "WORKER_WITH_SUB_AGENT" && data.workerSteps && data.workerSteps.length > 0;
  const showTeammates = data.skillType === "WORKER_WITH_AGENT_TEAM" && data.teammates && data.teammates.length > 0;

  return (
    <div className="ml-6 px-6 py-4 border-l-2 border-[var(--accent-teal-dim)] bg-gradient-to-br from-[rgba(10,158,128,0.03)] to-transparent my-1 rounded-r-md">
      {/* 説明 */}
      {data.description && (
        <div className="mb-3">
          <label className="block font-heading text-xs font-semibold mb-1 text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Description</label>
          <div className="text-sm text-[var(--text-secondary)] leading-normal">{data.description}</div>
        </div>
      )}

      {/* Allowed Tools */}
      {data.allowedTools && (
        <div className="mb-3">
          <label className="block font-heading text-xs font-semibold mb-1 text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Allowed Tools</label>
          <div className="text-sm text-[var(--text-secondary)] leading-normal">{data.allowedTools}</div>
        </div>
      )}

      {/* 構造表示: workerSteps */}
      {showWorkerSteps && data.workerSteps ? (
        <div className="flex flex-col gap-2">
          <SectionItems sections={data.workerSections?.filter(s => s.position === "before-steps") ?? []} supportFiles={data.supportFiles} />
          <label className="font-heading font-semibold text-sm text-[var(--text-primary)] mt-1">Worker Steps</label>
          <div className="flex flex-col gap-2">
            {data.workerSteps.map((step, i) => (
              <div key={step.id}>
                <SectionItems sections={getStepSections(data.workerSections, "before-step", i)} supportFiles={data.supportFiles} />
                <div className="mb-2">
                  <div className="font-heading text-sm font-medium text-[var(--text-primary)] py-1">
                    {step.id}. {step.title}
                  </div>
                  <BodyContent body={step.body} supportFiles={data.supportFiles} />
                </div>
                <SectionItems sections={getStepSections(data.workerSections, "after-step", i)} supportFiles={data.supportFiles} />
              </div>
            ))}
          </div>
          <SectionItems sections={[
            ...(data.workerSections?.filter(s => s.position === "after-steps") ?? []),
            ...getOutOfRangeSections(data.workerSections, data.workerSteps.length),
          ]} supportFiles={data.supportFiles} />
        </div>
      ) : (
        /* 本文（workerStepsがない場合） */
        data.content && (
          <div className="mb-3">
            <label className="block font-heading text-xs font-semibold mb-1 text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Content</label>
            <div className="ov-markdown m-0 p-3 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-sm font-sans text-[0.8125rem] break-words text-[var(--text-secondary)] leading-relaxed"><Markdown>{data.content}</Markdown></div>
          </div>
        )
      )}

      {/* 入力 */}
      {data.input && (
        <div className="mb-3">
          <label className="block font-heading text-xs font-semibold mb-1 text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Input</label>
          <div className="text-sm text-[var(--text-secondary)] leading-normal">{data.input}</div>
        </div>
      )}

      {/* 出力 */}
      {data.output && (
        <div className="mb-3">
          <label className="block font-heading text-xs font-semibold mb-1 text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Output</label>
          <div className="text-sm text-[var(--text-secondary)] leading-normal">{data.output}</div>
        </div>
      )}

      {/* AgentConfig */}
      {showAgentConfig && data.agentConfig && (
        <div className="border-t border-[var(--border-subtle)] pt-4 mt-4">
          <h5 className="font-heading m-0 mb-2 text-sm font-semibold text-[var(--text-primary)] tracking-[0.01em]">Agent Config</h5>
          <div className="mb-3">
            <label className="block font-heading text-xs font-semibold mb-1 text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Model</label>
            <span className="inline-block px-2.5 py-0.5 font-mono text-xs font-semibold rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white shadow-[0_0_12px_rgba(124,58,237,0.2)]">{data.agentConfig.model || "(not set)"}</span>
          </div>
          <div className="mb-3">
            <label className="block font-heading text-xs font-semibold mb-1 text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Tools</label>
            <div className="flex flex-wrap gap-1.5">
              {data.agentConfig.tools.length > 0 ? data.agentConfig.tools.map((tool) => (
                <span key={tool} className="inline-block px-2 py-0.5 font-mono text-xs font-medium rounded-sm bg-[var(--accent-violet-dim)] text-[var(--accent-violet)] border border-[rgba(124,92,191,0.2)] transition-[background] duration-150 hover:bg-[rgba(124,92,191,0.12)]">{tool}</span>
              )) : "(not set)"}
            </div>
          </div>
          {data.agentConfig.description || (data.agentConfig.sections && data.agentConfig.sections.length > 0) ? (
            <div className="flex flex-col gap-2">
              {data.agentConfig.description && (
                <div className="mb-3">
                  <label className="block font-heading text-xs font-semibold mb-1 text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Agent Description</label>
                  <div className="text-sm text-[var(--text-secondary)] leading-normal">{data.agentConfig.description}</div>
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
              <div className="mb-3">
                <label className="block font-heading text-xs font-semibold mb-1 text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Agent Content</label>
                <div className="ov-markdown m-0 p-3 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-sm font-sans text-[0.8125rem] break-words text-[var(--text-secondary)] leading-relaxed"><Markdown>{data.agentConfig.agentContent}</Markdown></div>
              </div>
            )
          )}
        </div>
      )}

      {/* Teammates */}
      {showTeammates && data.teammates && (
        <div className="border-t border-[var(--border-subtle)] pt-4 mt-4">
          <h5 className="font-heading m-0 mb-2 text-sm font-semibold text-[var(--text-primary)]">Teammates</h5>
          {data.teammates.map((mate) => (
            <div key={mate.name} className="border border-[rgba(10,158,128,0.15)] rounded-md mb-3 bg-gradient-to-br from-[rgba(10,158,128,0.04)] to-transparent transition-[border-color] duration-150 hover:border-[rgba(10,158,128,0.25)]">
              <div className="px-3.5 py-3 flex flex-col gap-0.5">
                <span className="font-heading font-semibold text-[var(--accent-teal)] text-[0.9375rem] tracking-tight">{mate.name}</span>
                <span className="text-[0.8125rem] text-[var(--text-secondary)]">{mate.role}</span>
              </div>
              <div className="px-3.5 pb-3.5">
                {mate.communicationPattern?.type === "poller" && (
                  <div className="text-[0.8125rem] text-[var(--text-tertiary)] py-0.5 font-mono">
                    polling &rarr; {mate.communicationPattern.target}
                  </div>
                )}
                {mate.communicationPattern?.type === "responder" && (
                  <div className="text-[0.8125rem] text-[var(--text-tertiary)] py-0.5 font-mono">
                    status_check responder
                  </div>
                )}
                <div className="mt-2">
                  {mate.steps.map((step) => (
                    <div key={step.id} className="mb-2">
                      <div className="font-heading text-sm font-medium text-[var(--text-primary)] py-1">
                        {step.id}. {step.title}
                      </div>
                      <BodyContent body={step.body} supportFiles={data.supportFiles} />
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
    <div className="py-6 animate-[fadeInUp_0.5s_ease-out]">
      <h4 className="font-heading text-[1.375rem] font-bold text-[var(--text-primary)] mb-2 tracking-tight">{skill.name}</h4>
      {skill.description && (
        <p className="text-[0.9rem] text-[var(--text-secondary)] mb-6 leading-relaxed">{skill.description}</p>
      )}

      {/* before-steps セクション */}
      <SectionItems sections={sections.filter(s => s.position === "before-steps")} />

      <div className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <div
            key={`${step.label}-${i}`}
            className="mb-2 animate-[slideInRight_0.4s_ease-out_both]"
            style={{ animationDelay: `${(i + 1) * 0.05}s` }}
          >
            <SectionItems sections={getStepSections(sections, "before-step", i)} />

            <StepItem step={step} index={i + 1} allSkills={allSkills} />

            <SectionItems sections={getStepSections(sections, "after-step", i)} />
          </div>
        ))}
      </div>

      {/* after-steps セクション + 範囲外フォールバック */}
      <SectionItems sections={[
        ...sections.filter(s => s.position === "after-steps"),
        ...getOutOfRangeSections(sections, steps.length),
      ]} />
    </div>
  );
}

