import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SectionItems } from "./SectionItems";
import { BodyContent } from "./BodyContent";
import { getStepSections, getOutOfRangeSections } from "./helpers";
import { COMMUNICATION_PATTERNS, SKILL_TYPES } from "../../lib/types/constants";
import type { SkillDetailData } from "./types";

// スキル詳細のインライン展開
export function SkillDetail({ data }: { data: SkillDetailData }) {
  const showAgentConfig =
    data.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT && data.agentConfig;
  const showWorkerSteps =
    data.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT &&
    data.workerSteps &&
    data.workerSteps.length > 0;
  const showTeammates =
    data.skillType === SKILL_TYPES.WORKER_WITH_AGENT_TEAM &&
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
      {data.input.length > 0 && (
        <div className="mb-3">
          <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
            Input
          </label>
          <div className="text-sm text-text-secondary leading-normal">
            {data.input.map((item) => `- ${item}`).join("\n")}
          </div>
        </div>
      )}

      {/* 出力 */}
      {data.output.length > 0 && (
        <div className="mb-3">
          <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
            Output
          </label>
          <div className="text-sm text-text-secondary leading-normal">
            {data.output.map((item) => `- ${item}`).join("\n")}
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
                {mate.communicationPattern?.type === COMMUNICATION_PATTERNS.POLLER && (
                  <div className="text-sm text-text-tertiary py-0.5 font-mono">
                    polling &rarr; {mate.communicationPattern.target}
                  </div>
                )}
                {mate.communicationPattern?.type === COMMUNICATION_PATTERNS.RESPONDER && (
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
