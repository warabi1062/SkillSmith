import { SectionItems } from "./SectionItems";
import { StepItem } from "./StepItem";
import { getStepSections, getOutOfRangeSections } from "./helpers";
import { convertStep, convertSections } from "./data";
import type { LoadedSkillUnion, LoadedOrchestratorSection } from "../../lib/types/loader.server";

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
