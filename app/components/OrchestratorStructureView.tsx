import { useState } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  steps: WorkerStepFields[];
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
    inlineSteps: inline.steps.map((s) => ({
      id: s.id,
      title: s.title,
      body: s.body,
      bodyFile: s.bodyFile,
    })),
    inlineTools: inline.tools?.map(serializeToolRef),
  };
}

export function convertSections(
  sections: LoadedOrchestratorSection[],
): SectionFields[] {
  return sections.map((s) => ({
    heading: s.heading,
    body: s.body,
    bodyFile: s.bodyFile,
    position: s.position,
  }));
}

// --- ヘルパー関数 ---

// セクションのpositionを解析するヘルパー
function parseStepPosition(
  position: string,
): { type: "before-step" | "after-step"; index: number } | null {
  const match = position.match(/^(before-step|after-step):(\d+)$/);
  if (!match) return null;
  return {
    type: match[1] as "before-step" | "after-step",
    index: Number(match[2]),
  };
}

// 指定indexのbefore-step/after-stepセクションを取得するヘルパー
function getStepSections(
  sections: SectionFields[] | null | undefined,
  type: "before-step" | "after-step",
  index: number,
): SectionFields[] {
  return (
    sections?.filter((s) => {
      const parsed = parseStepPosition(s.position);
      return parsed?.type === type && parsed.index === index;
    }) ?? []
  );
}

// 範囲外indexのstep間セクションを取得するヘルパー
function getOutOfRangeSections(
  sections: SectionFields[] | null | undefined,
  stepCount: number,
): SectionFields[] {
  return (
    sections?.filter((s) => {
      const parsed = parseStepPosition(s.position);
      if (!parsed) return false;
      return parsed.index < 0 || parsed.index >= stepCount;
    }) ?? []
  );
}

// --- skill情報の組み立て ---

export interface SkillDetailData {
  name: string;
  description: string | null;
  skillType: string;
  content: string;
  input: string;
  output: string;
  allowedTools: string[] | null;
  steps: StepFields[] | null;
  sections: SectionFields[] | null;
  agentConfig: AgentConfigFields | null;
  workerSteps: WorkerStepFields[] | null;
  workerSections: SectionFields[] | null;
  teammates: TeammateFields[] | null;
  supportFiles: SupportFileMap;
}

export function buildSkillDetailData(skill: LoadedSkillUnion): SkillDetailData {
  const agentConfigData =
    skill.skillType === "WORKER_WITH_SUB_AGENT" ? skill.agentConfig : null;

  const workerStepsData: WorkerStepFields[] | null =
    skill.skillType === "WORKER_WITH_SUB_AGENT" && skill.workerSteps
      ? skill.workerSteps.map((s) => ({
          id: s.id,
          title: s.title,
          body: s.body,
          bodyFile: s.bodyFile,
        }))
      : null;

  const workerSectionsData: SectionFields[] | null =
    skill.skillType === "WORKER_WITH_SUB_AGENT" && skill.workerSections
      ? skill.workerSections.map((s) => ({
          heading: s.heading,
          body: s.body,
          bodyFile: s.bodyFile,
          position: s.position,
        }))
      : null;

  const teammatesData =
    skill.skillType === "WORKER_WITH_AGENT_TEAM" && skill.teammates
      ? skill.teammates.map((t) => ({
          name: t.name,
          role: t.role,
          steps: t.steps.map((s) => ({
            id: s.id,
            title: s.title,
            body: s.body,
            bodyFile: s.bodyFile,
          })),
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
      ? skill.allowedTools.map(serializeToolRef)
      : null,
    steps: skill.steps ? skill.steps.map(convertStep) : null,
    sections: skill.sections
      ? convertSections(skill.sections as LoadedOrchestratorSection[])
      : null,
    agentConfig: agentConfigData
      ? {
          model: agentConfigData.model ?? "",
          tools: (agentConfigData.tools ?? []).map(serializeToolRef),
          agentContent: agentConfigData.content ?? "",
          description: agentConfigData.description,
          sections: agentConfigData.sections?.map((s) => ({
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
      (skill.files ?? []).map((f) => [f.filename, f.content]),
    ),
  };
}

// --- 表示コンポーネント ---

// bodyFile の内容をサイドパネルで表示するコンポーネント（Portalで body 直下にレンダリング）
function BodyFilePanel({
  filename,
  content,
  onClose,
}: {
  filename: string;
  content: string;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-transparent flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-[min(600px,90vw)] h-screen bg-bg-surface border-l border-border-default flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <span className="font-mono text-sm font-semibold text-text-primary">
            {filename}
          </span>
          <button
            className="bg-transparent border-none text-2xl text-text-tertiary cursor-pointer px-1 leading-none hover:text-text-primary"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="ov-sidepanel-content flex-1 overflow-y-auto p-5 text-sm leading-relaxed text-text-secondary">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// body テキスト内をMarkdownレンダリングするコンポーネント
// supportFiles内のファイルへのリンクはクリックでサイドパネルを開く
function BodyContent({
  body,
  supportFiles,
}: {
  body: string;
  supportFiles?: SupportFileMap;
}) {
  const [openFile, setOpenFile] = useState<string | null>(null);

  if (!body) return null;

  return (
    <>
      <div className="my-1 mb-2 font-body text-sm break-words text-text-secondary leading-relaxed ov-markdown">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              const filename = href?.replace(/^\.\//, "") ?? "";
              const fileContent = supportFiles?.[filename];
              if (fileContent !== undefined) {
                return (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 font-mono text-[0.8rem] text-accent-teal bg-bg-elevated border border-border-subtle rounded-sm cursor-pointer hover:border-accent-teal hover:bg-accent-teal-dim transition-all before:content-['📄'] before:text-xs"
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
function SectionItems({
  sections,
  supportFiles,
}: {
  sections: SectionFields[];
  supportFiles?: SupportFileMap;
}) {
  return (
    <>
      {sections.map((s) => (
        <div
          key={s.heading}
          className="border border-border-subtle rounded-md mb-2 overflow-hidden bg-bg-surface"
        >
          <div className="px-3.5 py-2 font-display text-sm font-medium text-text-tertiary bg-bg-elevated border-b border-border-subtle">
            {s.heading}
          </div>
          <div className="px-3.5 py-2.5">
            <BodyContent body={s.body} supportFiles={supportFiles} />
          </div>
        </div>
      ))}
    </>
  );
}

// ステップの再帰的表示コンポーネント
function StepItem({
  step,
  index,
  allSkills,
  prefix = "",
}: {
  step: StepFields;
  index: number;
  allSkills: LoadedSkillUnion[];
  prefix?: string;
}) {
  const stepLabel = `Step${prefix}${index}`;
  if (step.type === "branch") {
    return (
      <div className="border border-border-subtle rounded-md bg-bg-surface transition-all hover:border-border-default">
        <div className="px-3.5 py-2.5 font-display text-sm font-medium flex items-center gap-2 text-accent-blue font-semibold">
          {stepLabel}. {step.label}
        </div>
        <div className="px-3.5 pb-3.5">
          {step.description && (
            <div className="my-1 mb-2 font-body text-sm break-words text-text-secondary leading-relaxed ov-markdown">
              <Markdown remarkPlugins={[remarkGfm]}>{step.description}</Markdown>
            </div>
          )}
          {step.cases?.map((c, caseIndex) => {
            const caseLetter = String.fromCharCode(65 + caseIndex);
            return (
              <div
                key={c.name}
                className="mt-2 ml-4 border-l-2 border-accent-blue-border pl-4"
              >
                <div className="font-display text-sm font-semibold text-accent-blue mb-1 tracking-[0.01em]">
                  {c.name}
                </div>
                <div className="flex flex-col gap-1.5">
                  {c.steps.map((s, i) => (
                    <StepItem
                      key={`${s.label}-${i}`}
                      step={s}
                      index={i + 1}
                      allSkills={allSkills}
                      prefix={`${prefix}${index}${caseLetter}-`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (step.type === "inline") {
    return (
      <div className="border border-border-subtle rounded-md bg-bg-surface transition-all hover:border-border-default">
        <div className="px-3.5 py-2.5 font-display text-sm font-medium text-text-primary flex items-center gap-2">
          {stepLabel}. {step.label}
          <span className="inline-block px-2 py-px font-mono text-[0.625rem] font-semibold rounded-sm leading-relaxed tracking-wider uppercase bg-bg-hover text-text-secondary border border-border-default">
            INLINE
          </span>
        </div>
        <div className="px-3.5 pb-3.5">
          {step.inlineTools && step.inlineTools.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center mb-2">
              <span className="font-display text-xs font-semibold text-text-tertiary mr-1 uppercase tracking-wider">
                Tools:
              </span>
              {step.inlineTools.map((tool) => (
                <span
                  key={tool}
                  className="inline-block px-2 py-0.5 font-mono text-xs font-medium rounded-sm bg-accent-violet-dim text-accent-violet border border-accent-violet-border hover:bg-accent-violet-hover transition-colors"
                >
                  {tool}
                </span>
              ))}
            </div>
          )}
          {step.inlineSteps && step.inlineSteps.length > 0 && (
            <div>
              {step.inlineSteps.map((subStep) => (
                <div key={subStep.id} className="mb-2">
                  <div className="font-display text-sm font-medium text-text-primary py-1">
                    {stepLabel}-{subStep.id}. {subStep.title}
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
  const referencedSkill = allSkills.find((s) => s.name === step.label) ?? null;

  return (
    <div className="border border-border-subtle rounded-md bg-bg-surface transition-all hover:border-border-default">
      <div className="px-3.5 py-2.5 font-display text-sm font-medium text-text-primary flex items-center gap-2">
        {stepLabel}. {step.label}
        <span className="inline-block px-2 py-px font-mono text-[0.625rem] font-semibold rounded-sm leading-relaxed tracking-wider uppercase bg-accent-amber-dim text-accent-amber border border-accent-amber-border">
          SKILL
        </span>
      </div>
      {referencedSkill && (
        <SkillDetail data={buildSkillDetailData(referencedSkill)} />
      )}
    </div>
  );
}

// スキル詳細のインライン展開
export function SkillDetail({ data }: { data: SkillDetailData }) {
  const showAgentConfig =
    data.skillType === "WORKER_WITH_SUB_AGENT" && data.agentConfig;
  const showWorkerSteps =
    data.skillType === "WORKER_WITH_SUB_AGENT" &&
    data.workerSteps &&
    data.workerSteps.length > 0;
  const showTeammates =
    data.skillType === "WORKER_WITH_AGENT_TEAM" &&
    data.teammates &&
    data.teammates.length > 0;

  return (
    <div className="ml-6 px-6 py-4 border-l-[3px] border-border-strong my-1 rounded-r-md">
      {/* 説明 */}
      {data.description && (
        <div className="mb-3">
          <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
            Description
          </label>
          <div className="text-sm text-text-secondary leading-normal">
            {data.description}
          </div>
        </div>
      )}

      {/* Allowed Tools */}
      {data.allowedTools && data.allowedTools.length > 0 && (
        <div className="mb-3">
          <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
            Allowed Tools
          </label>
          <div className="flex flex-wrap gap-1.5">
            {data.allowedTools.map((tool) => (
              <span
                key={tool}
                className="inline-block px-2 py-0.5 font-mono text-xs font-medium rounded-sm bg-accent-violet-dim text-accent-violet border border-accent-violet-border hover:bg-accent-violet-hover transition-colors"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 構造表示: workerSteps */}
      {showWorkerSteps && data.workerSteps ? (
        <div className="flex flex-col gap-2">
          <SectionItems
            sections={
              data.workerSections?.filter(
                (s) => s.position === "before-steps",
              ) ?? []
            }
            supportFiles={data.supportFiles}
          />
          <label className="font-display font-semibold text-sm text-text-primary mt-1">
            Worker Steps
          </label>
          <div className="flex flex-col gap-2">
            {data.workerSteps.map((step, i) => (
              <div key={step.id}>
                <SectionItems
                  sections={getStepSections(
                    data.workerSections,
                    "before-step",
                    i,
                  )}
                  supportFiles={data.supportFiles}
                />
                <div className="mb-2">
                  <div className="font-display text-sm font-medium text-text-primary py-1">
                    {step.id}. {step.title}
                  </div>
                  <BodyContent
                    body={step.body}
                    supportFiles={data.supportFiles}
                  />
                </div>
                <SectionItems
                  sections={getStepSections(
                    data.workerSections,
                    "after-step",
                    i,
                  )}
                  supportFiles={data.supportFiles}
                />
              </div>
            ))}
          </div>
          <SectionItems
            sections={[
              ...(data.workerSections?.filter(
                (s) => s.position === "after-steps",
              ) ?? []),
              ...getOutOfRangeSections(
                data.workerSections,
                data.workerSteps.length,
              ),
            ]}
            supportFiles={data.supportFiles}
          />
        </div>
      ) : (
        /* 本文（workerStepsがない場合） */
        data.content && (
          <div className="mb-3">
            <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
              Content
            </label>
            <div className="m-0 p-3 bg-bg-deep border border-border-subtle rounded-sm font-body text-sm break-words text-text-secondary leading-relaxed ov-markdown">
              <Markdown remarkPlugins={[remarkGfm]}>{data.content}</Markdown>
            </div>
          </div>
        )
      )}

      {/* 入力 */}
      {data.input && (
        <div className="mb-3">
          <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
            Input
          </label>
          <div className="text-sm text-text-secondary leading-normal">
            {data.input}
          </div>
        </div>
      )}

      {/* 出力 */}
      {data.output && (
        <div className="mb-3">
          <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
            Output
          </label>
          <div className="text-sm text-text-secondary leading-normal">
            {data.output}
          </div>
        </div>
      )}

      {/* AgentConfig */}
      {showAgentConfig && data.agentConfig && (
        <div className="border-t border-border-subtle pt-4 mt-4">
          <h5 className="font-display mb-2 text-sm font-semibold text-text-primary tracking-[0.01em]">
            Agent Config
          </h5>
          <div className="mb-3">
            <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
              Model
            </label>
            <span className="inline-block px-2.5 py-0.5 font-mono text-xs font-semibold rounded-full bg-gradient-to-br from-model-purple-from to-model-purple-to text-white shadow-[0_0_12px_var(--color-model-purple-glow)]">
              {data.agentConfig.model || "(not set)"}
            </span>
          </div>
          <div className="mb-3">
            <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
              Tools
            </label>
            <div className="flex flex-wrap gap-1.5">
              {data.agentConfig.tools.length > 0
                ? data.agentConfig.tools.map((tool) => (
                    <span
                      key={tool}
                      className="inline-block px-2 py-0.5 font-mono text-xs font-medium rounded-sm bg-accent-violet-dim text-accent-violet border border-accent-violet-border hover:bg-accent-violet-hover transition-colors"
                    >
                      {tool}
                    </span>
                  ))
                : "(not set)"}
            </div>
          </div>
          {data.agentConfig.description ||
          (data.agentConfig.sections &&
            data.agentConfig.sections.length > 0) ? (
            <div className="flex flex-col gap-2">
              {data.agentConfig.description && (
                <div className="mb-3">
                  <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
                    Agent Description
                  </label>
                  <div className="text-sm text-text-secondary leading-normal">
                    {data.agentConfig.description}
                  </div>
                </div>
              )}
              <SectionItems
                sections={
                  data.agentConfig.sections?.filter(
                    (s) =>
                      s.position === "before-steps" ||
                      s.position.startsWith("before-step:"),
                  ) ?? []
                }
              />
              <SectionItems
                sections={
                  data.agentConfig.sections?.filter(
                    (s) =>
                      s.position === "after-steps" ||
                      s.position.startsWith("after-step:"),
                  ) ?? []
                }
              />
            </div>
          ) : (
            data.agentConfig.agentContent && (
              <div className="mb-3">
                <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
                  Agent Content
                </label>
                <div className="m-0 p-3 bg-bg-deep border border-border-subtle rounded-sm font-body text-sm break-words text-text-secondary leading-relaxed ov-markdown">
                  <Markdown remarkPlugins={[remarkGfm]}>{data.agentConfig.agentContent}</Markdown>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Teammates */}
      {showTeammates && data.teammates && (
        <div className="border-t border-border-subtle pt-4 mt-4">
          <h5 className="font-display mb-2 text-sm font-semibold text-text-primary">
            Teammates
          </h5>
          {data.teammates.map((mate) => (
            <div
              key={mate.name}
              className="border-l-[3px] border-accent-teal mb-3 pl-4"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-display font-semibold text-accent-teal text-[0.9375rem] tracking-tight">
                  {mate.name}
                </span>
                <span className="text-sm text-text-secondary">{mate.role}</span>
              </div>
              <div className="pb-2">
                {mate.communicationPattern?.type === "poller" && (
                  <div className="text-sm text-text-tertiary py-0.5 font-mono">
                    polling &rarr; {mate.communicationPattern.target}
                  </div>
                )}
                {mate.communicationPattern?.type === "responder" && (
                  <div className="text-sm text-text-tertiary py-0.5 font-mono">
                    status_check responder
                  </div>
                )}
                <div className="mt-2">
                  {mate.steps.map((step) => (
                    <div key={step.id} className="mb-2">
                      <div className="font-display text-sm font-medium text-text-primary py-1">
                        {step.id}. {step.title}
                      </div>
                      <BodyContent
                        body={step.body}
                        supportFiles={data.supportFiles}
                      />
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
export function OrchestratorView({
  skill,
  allSkills,
}: {
  skill: LoadedSkillUnion;
  allSkills: LoadedSkillUnion[];
}) {
  const steps = skill.steps ? skill.steps.map(convertStep) : [];
  const sections = skill.sections
    ? convertSections(skill.sections as LoadedOrchestratorSection[])
    : [];

  return (
    <div className="py-6">
      <h4 className="font-display text-[1.375rem] font-bold text-text-primary mb-2 tracking-tight">
        {skill.name}
      </h4>
      {skill.description && (
        <p className="text-[0.9rem] text-text-secondary mb-6 leading-relaxed">
          {skill.description}
        </p>
      )}

      {/* before-steps セクション */}
      <SectionItems
        sections={sections.filter((s) => s.position === "before-steps")}
      />

      <div className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <div key={`${step.label}-${i}`} className="mb-2">
            <SectionItems
              sections={getStepSections(sections, "before-step", i)}
            />

            <StepItem step={step} index={i + 1} allSkills={allSkills} />

            <SectionItems
              sections={getStepSections(sections, "after-step", i)}
            />
          </div>
        ))}
      </div>

      {/* after-steps セクション + 範囲外フォールバック */}
      <SectionItems
        sections={[
          ...sections.filter((s) => s.position === "after-steps"),
          ...getOutOfRangeSections(sections, steps.length),
        ]}
      />
    </div>
  );
}
