import { SectionItems } from "./SectionItems";
import { BodyContent } from "./BodyContent";
import { COMMUNICATION_PATTERNS, SKILL_TYPES } from "../../lib/types/constants";
import type { SkillDetailData } from "./types";

// スキル詳細のインライン展開
export function SkillDetail({ data }: { data: SkillDetailData }) {
  const showWorkerSteps =
    (data.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT ||
      data.skillType === SKILL_TYPES.WORKER) &&
    data.workerSteps &&
    data.workerSteps.length > 0;
  const showTeammates =
    data.skillType === SKILL_TYPES.WORKER_WITH_AGENT_TEAM &&
    data.teammates &&
    data.teammates.length > 0;

  return (
    <div className="ml-6 px-6 py-4 my-1">
      {/* 説明（ラベルは省略） */}
      {data.description && (
        <div className="mb-3">
          <div className="text-sm text-text-secondary leading-normal">
            {data.description}
          </div>
        </div>
      )}

      {/* 入力 */}
      {data.input.length > 0 && (
        <div className="mb-3">
          <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
            Input
          </label>
          <ul className="list-disc list-inside text-sm text-text-secondary leading-normal space-y-0.5">
            {data.input.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 出力 */}
      {data.output.length > 0 && (
        <div className="mb-3">
          <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
            Output
          </label>
          <ul className="list-disc list-inside text-sm text-text-secondary leading-normal space-y-0.5">
            {data.output.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 構造表示: workerSteps */}
      {showWorkerSteps && data.workerSteps ? (
        <div className="flex flex-col gap-2">
          <SectionItems
            sections={data.beforeSections ?? []}
            supportFiles={data.supportFiles}
          />
          <label className="font-display font-semibold text-sm text-text-primary mt-1">
            Worker Steps
          </label>
          <div className="flex flex-col gap-2">
            {data.workerSteps.map((step) => (
              <div key={step.id}>
                <div className="mb-2">
                  <div className="font-display text-sm font-medium text-text-primary py-1">
                    {step.id}. {step.title}
                  </div>
                  <BodyContent
                    body={step.body}
                    supportFiles={data.supportFiles}
                  />
                </div>
              </div>
            ))}
          </div>
          <SectionItems
            sections={data.afterSections ?? []}
            supportFiles={data.supportFiles}
          />
        </div>
      ) : null}

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
                {mate.communicationPattern?.type ===
                  COMMUNICATION_PATTERNS.POLLER && (
                  <div className="text-sm text-text-tertiary py-0.5 font-mono">
                    polling &rarr; {mate.communicationPattern.target}
                  </div>
                )}
                {mate.communicationPattern?.type ===
                  COMMUNICATION_PATTERNS.RESPONDER && (
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
