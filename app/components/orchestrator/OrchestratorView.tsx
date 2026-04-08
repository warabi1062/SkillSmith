import { SectionItems } from "./SectionItems";
import { StepItem } from "./StepItem";
import { convertStep, convertSections } from "./data";
import type { LoadedSkillUnion, LoadedSection } from "../../lib/types/loaded";

// オーケストレーター単体の構造表示
export function OrchestratorView({
  skill,
  allSkills,
}: {
  skill: LoadedSkillUnion;
  allSkills: LoadedSkillUnion[];
}) {
  const steps = skill.steps ? skill.steps.map(convertStep) : [];
  const beforeSections = skill.beforeSections
    ? convertSections(skill.beforeSections)
    : [];
  const afterSections = skill.afterSections
    ? convertSections(skill.afterSections)
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

      {/* beforeSections */}
      <SectionItems sections={beforeSections} />

      <div className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <div key={`${step.label}-${i}`} className="mb-2">
            <StepItem step={step} index={i + 1} allSkills={allSkills} />
          </div>
        ))}
      </div>

      {/* afterSections */}
      <SectionItems sections={afterSections} />
    </div>
  );
}
