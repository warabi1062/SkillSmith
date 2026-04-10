import { SectionItems } from "./SectionItems";
import { BodyContent } from "./BodyContent";
import { StepItem } from "./StepItem";
import { COMMUNICATION_PATTERNS } from "../../lib/types/constants";
import type { SkillDetailData } from "./types";
import type { LoadedSkillUnion } from "../../lib/types/loaded";

// スキル詳細の共通表示コンポーネント（全スキルタイプ対応）
export function SkillDetail({
  data,
  allSkills = [],
}: {
  data: SkillDetailData;
  allSkills?: LoadedSkillUnion[];
}) {
  return (
    <div className="px-3.5 py-3 my-1">
      {/* 付属情報: description, input, output, beforeSections, afterSections */}
      <div className="mb-4 p-4 border border-border-subtle rounded-md bg-bg-surface">
        {data.description && (
          <div className="mb-3">
            <div className="text-sm text-text-secondary leading-normal">
              {data.description}
            </div>
          </div>
        )}

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

        <SectionItems
          sections={data.beforeSections ?? []}
          supportFiles={data.supportFiles}
        />

        <SectionItems
          sections={data.afterSections ?? []}
          supportFiles={data.supportFiles}
        />
      </div>

      {/* ステップ詳細 */}
      {data.steps && data.steps.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.steps.map((step, i) => (
            <div key={`${step.label}-${i}`} className="mb-2">
              <StepItem step={step} index={i + 1} allSkills={allSkills} />
            </div>
          ))}
        </div>
      )}

      {/* Teammates */}
      {data.teammates && data.teammates.length > 0 && (
        <div className="border-t border-border-subtle pt-4 mt-4">
          <h5 className="font-display mb-2 text-sm font-semibold text-text-primary">
            Teammates
          </h5>
          {data.teammates.map((mate) => (
            <div key={mate.name} className="mb-3">
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
