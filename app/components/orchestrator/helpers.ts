import { parseStepPosition } from "../../lib/core/section-utils";
import type { SectionFields } from "./types";

// --- ヘルパー関数 ---

// 指定indexのbefore-step/after-stepセクションを取得するヘルパー
export function getStepSections(
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
export function getOutOfRangeSections(
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
