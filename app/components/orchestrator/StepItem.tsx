import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BodyContent } from "./BodyContent";
import { SkillDetail } from "./SkillDetail";
import { buildSkillDetailData } from "./data";
import type { StepFields } from "./types";
import type { LoadedSkillUnion } from "../../lib/types/loaded";
import { SKILL_TYPES } from "../../lib/types/constants";

// ステップの再帰的表示コンポーネント
export function StepItem({
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
        <div className="px-3.5 py-2.5 font-display text-base font-semibold flex items-center gap-2 text-text-primary">
          {stepLabel}. {step.label}
        </div>
        <div className="px-3.5 pb-3.5">
          {step.description && (
            <div className="my-1 mb-2 font-body text-sm break-words text-text-secondary leading-relaxed ov-markdown">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({ children }) => <span>{children}</span>,
                }}
              >
                {step.description}
              </Markdown>
            </div>
          )}
          {step.cases?.map((c, caseIndex) => {
            const caseLetter = String.fromCharCode(65 + caseIndex);
            return (
              <div key={c.name} className="mt-2 ml-2">
                <div className="font-display text-sm font-semibold text-text-primary mb-1 tracking-[0.01em]">
                  {caseLetter}: {c.name}
                </div>
                <div className="flex flex-col gap-1.5">
                  {c.steps.map((s, i) => (
                    <StepItem
                      key={`${s.label}-${i}`}
                      step={s}
                      index={i + 1}
                      allSkills={allSkills}
                      prefix={`${prefix}${index}-${caseLetter}`}
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
        <div className="px-3.5 py-2.5 font-display text-base font-semibold text-text-primary flex items-center gap-2">
          {stepLabel}. {step.label}
        </div>
        <div className="px-3.5 pb-3.5">
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
      <div className="px-3.5 py-2.5 font-display text-base font-semibold text-text-primary flex items-center gap-2">
        {stepLabel}. {step.label}
        <span className="inline-block px-2 py-px font-mono text-[0.625rem] font-semibold rounded-sm leading-relaxed tracking-wider uppercase bg-accent-amber-dim text-accent-amber border border-accent-amber-border">
          SKILL
        </span>
        {referencedSkill?.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT && (
          <span className="inline-block px-2 py-px font-mono text-[0.625rem] font-semibold rounded-sm leading-relaxed tracking-wider uppercase bg-accent-violet-dim text-accent-violet border border-accent-violet-border">
            SUB AGENT
          </span>
        )}
        {referencedSkill?.skillType === SKILL_TYPES.WORKER_WITH_AGENT_TEAM && (
          <span className="inline-block px-2 py-px font-mono text-[0.625rem] font-semibold rounded-sm leading-relaxed tracking-wider uppercase bg-accent-teal-dim text-accent-teal border border-accent-teal-border">
            AGENT TEAM
          </span>
        )}
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
