import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BodyContent } from "./BodyContent";
import { SkillDetail } from "./SkillDetail";
import { buildSkillDetailData } from "./data";
import type { StepFields } from "./types";
import type { LoadedSkillUnion } from "../../lib/types/loaded";
import { SKILL_TYPES } from "../../lib/types/constants";

// ネスト深度に応じたM3 surface-containerレベルのマッピング
const DEPTH_BG = [
  "bg-surface-container-lowest",
  "bg-surface-container-low",
  "bg-surface-container",
  "bg-surface-container-high",
  "bg-surface-container-highest",
] as const;

// ネスト深度に応じたM3 elevationシャドウのマッピング
const DEPTH_SHADOW = [
  "shadow-level1",
  "shadow-level1",
  "shadow-level2",
  "shadow-level2",
  "shadow-level3",
] as const;

function getDepthBg(depth: number): string {
  return DEPTH_BG[Math.min(depth, DEPTH_BG.length - 1)];
}

function getDepthShadow(depth: number): string {
  return DEPTH_SHADOW[Math.min(depth, DEPTH_SHADOW.length - 1)];
}

// ステップの再帰的表示コンポーネント
export function StepItem({
  step,
  index,
  allSkills,
  prefix = "",
  depth = 0,
}: {
  step: StepFields;
  index: number;
  allSkills: LoadedSkillUnion[];
  prefix?: string;
  depth?: number;
}) {
  const stepLabel = `Step${prefix}${index}`;
  const bgClass = getDepthBg(depth);
  const shadowClass = getDepthShadow(depth);

  if (step.type === "branch") {
    return (
      <div className={`rounded-md ${bgClass} ${shadowClass}`}>
        <div className="px-4 py-3 font-display text-base font-semibold flex items-center gap-2 text-on-surface">
          {stepLabel}. {step.label}
        </div>
        <div className="px-4 pb-4">
          {step.description && (
            <div className="my-1 mb-2 font-body text-sm break-words text-on-surface-variant leading-relaxed ov-markdown">
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
              <div key={c.name} className="mt-3 ml-2">
                <div className="font-display text-sm font-semibold text-on-surface mb-1.5 tracking-[0.01em]">
                  {caseLetter}: {c.name}
                </div>
                <div className="flex flex-col gap-2">
                  {c.steps.map((s, i) => (
                    <StepItem
                      key={`${s.label}-${i}`}
                      step={s}
                      index={i + 1}
                      allSkills={allSkills}
                      prefix={`${prefix}${index}-${caseLetter}`}
                      depth={depth + 1}
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
      <div className={`rounded-md ${bgClass} ${shadowClass}`}>
        <div className="px-4 py-3 font-display text-base font-semibold text-on-surface flex items-center gap-2">
          {stepLabel}. {step.label}
        </div>
        <div className="px-4 pb-4">
          {step.inlineSteps && step.inlineSteps.length > 0 && (
            <div>
              {step.inlineSteps.map((subStep) => (
                <div key={subStep.id} className="mb-2">
                  <div className="font-display text-sm font-medium text-on-surface py-1">
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
    <div className={`rounded-md ${bgClass} ${shadowClass}`}>
      <div className="px-4 py-3 font-display text-base font-semibold text-on-surface flex items-center gap-2.5">
        {stepLabel}. {step.label}
        <span className="inline-block px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold rounded-full leading-relaxed tracking-wider uppercase bg-accent-amber-container text-accent-amber-on-container">
          SKILL
        </span>
        {referencedSkill?.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT && (
          <span className="inline-block px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold rounded-full leading-relaxed tracking-wider uppercase bg-accent-violet-container text-accent-violet-on-container">
            SUB AGENT
          </span>
        )}
        {referencedSkill?.skillType === SKILL_TYPES.WORKER_WITH_AGENT_TEAM && (
          <span className="inline-block px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold rounded-full leading-relaxed tracking-wider uppercase bg-primary-container text-on-primary-container">
            AGENT TEAM
          </span>
        )}
      </div>
      {referencedSkill && (
        <SkillDetail
          data={buildSkillDetailData(referencedSkill)}
          allSkills={allSkills}
          depth={depth + 1}
        />
      )}
    </div>
  );
}
