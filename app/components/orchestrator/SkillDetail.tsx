import { SectionItems } from "./SectionItems";
import { BodyContent } from "./BodyContent";
import { StepItem } from "./StepItem";
import type { SkillDetailData } from "./types";
import type { LoadedSkillUnion } from "../../lib/types/loaded";

// スキル詳細の共通表示コンポーネント（全スキルタイプ対応）
export function SkillDetail({
  data,
  allSkills = [],
  depth = 0,
}: {
  data: SkillDetailData;
  allSkills?: LoadedSkillUnion[];
  depth?: number;
}) {
  return (
    <div className="px-4 py-3 my-1">
      {/* 付属情報: description, input, output, beforeSections, afterSections */}
      <div className="mb-4 p-4 rounded-md bg-surface-container-low">
        {data.description && (
          <div className="mb-3">
            <div className="text-sm text-on-surface-variant leading-relaxed">
              {data.description}
            </div>
          </div>
        )}

        {data.input.length > 0 && (
          <div className="mb-3">
            <label className="block font-display text-[0.6875rem] font-semibold mb-1.5 text-on-surface-variant uppercase tracking-widest">
              入力
            </label>
            <ul className="list-disc list-inside text-sm text-on-surface-variant leading-relaxed space-y-0.5">
              {data.input.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {data.output.length > 0 && (
          <div className="mb-3">
            <label className="block font-display text-[0.6875rem] font-semibold mb-1.5 text-on-surface-variant uppercase tracking-widest">
              出力
            </label>
            <ul className="list-disc list-inside text-sm text-on-surface-variant leading-relaxed space-y-0.5">
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

        {data.teamRules && data.teamRules.length > 0 && (
          <div className="mb-3">
            <label className="block font-display text-[0.6875rem] font-semibold mb-1.5 text-on-surface-variant uppercase tracking-widest">
              共通ルール
            </label>
            <ul className="list-disc list-inside text-sm text-on-surface-variant leading-relaxed space-y-0.5">
              {data.teamRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ステップ詳細 */}
      {data.steps && data.steps.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.steps.map((step, i) => (
            <StepItem
              key={`${step.label}-${i}`}
              step={step}
              index={i + 1}
              allSkills={allSkills}
              depth={depth}
            />
          ))}
        </div>
      )}

      {/* Teammates */}
      {data.teammates && data.teammates.length > 0 && (
        <div className="border-t border-outline-variant pt-4 mt-5">
          <h5 className="font-display mb-3 text-sm font-semibold text-on-surface">
            Teammates
          </h5>
          {data.teammates.map((mate) => (
            <div key={mate.name} className="mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-display font-semibold text-primary text-[0.9375rem] tracking-tight">
                  {mate.name}
                </span>
                <span className="text-sm text-on-surface-variant">
                  {mate.role}
                </span>
              </div>
              <div className="pb-2">
                {mate.duties && (
                  <ul className="mt-2 list-disc list-inside text-sm text-on-surface-variant leading-relaxed space-y-0.5">
                    {mate.duties.map((duty) => (
                      <li key={duty}>{duty}</li>
                    ))}
                  </ul>
                )}
                {mate.steps && (
                  <div className="mt-2">
                    {mate.steps.map((step) => (
                      <div key={step.id} className="mb-2">
                        <div className="font-display text-sm font-medium text-on-surface py-1">
                          {step.id}. {step.title}
                        </div>
                        <BodyContent
                          body={step.body}
                          supportFiles={data.supportFiles}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
