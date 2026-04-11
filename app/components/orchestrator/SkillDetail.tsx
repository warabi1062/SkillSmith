import { SectionItems } from "./SectionItems";
import { BodyContent } from "./BodyContent";
import { StepItem } from "./StepItem";
import { COMMUNICATION_PATTERNS } from "../../lib/types/constants";
import type { SkillDetailData } from "./types";
import type { LoadedSkillUnion } from "../../lib/types/loaded";

// ネスト深度に応じたM3 surface-containerレベルのマッピング
const DEPTH_BG = [
  "bg-surface-container-lowest",
  "bg-surface-container-low",
  "bg-surface-container",
  "bg-surface-container-high",
  "bg-surface-container-highest",
] as const;

function getDepthBg(depth: number): string {
  return DEPTH_BG[Math.min(depth, DEPTH_BG.length - 1)];
}

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
  const bgClass = getDepthBg(depth);

  return (
    <div className="px-4 py-3 my-1">
      {/* 付属情報: description, input, output, beforeSections, afterSections */}
      <div className={`mb-4 p-4 rounded-md ${bgClass}`}>
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
                {mate.communicationPattern?.type ===
                  COMMUNICATION_PATTERNS.POLLER && (
                  <div className="text-sm text-outline py-0.5 font-mono">
                    polling &rarr; {mate.communicationPattern.target}
                  </div>
                )}
                {mate.communicationPattern?.type ===
                  COMMUNICATION_PATTERNS.RESPONDER && (
                  <div className="text-sm text-outline py-0.5 font-mono">
                    status_check responder
                  </div>
                )}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
