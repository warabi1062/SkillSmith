// セクション関連の共有ユーティリティ（orchestrator / worker で共通利用）

import type { LoadedOrchestratorSection } from "../types/loaded";

// セクションのpositionを解析するヘルパー
export function parseStepPosition(
  position: string,
): { type: "before-step" | "after-step"; index: number } | null {
  const match = position.match(/^(before-step|after-step):(\d+)$/);
  if (!match) return null;
  return {
    type: match[1] as "before-step" | "after-step",
    index: Number(match[2]),
  };
}

// セクションをレンダリングするヘルパー
export function renderSections(
  sections: LoadedOrchestratorSection[],
): string[] {
  const lines: string[] = [];
  for (const section of sections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }
  return lines;
}

// before-steps ポジションのセクションをフィルタリングする
export function filterBeforeStepsSections(
  sections: LoadedOrchestratorSection[],
): LoadedOrchestratorSection[] {
  return sections.filter((s) => s.position === "before-steps");
}

// after-steps ポジションのセクションをフィルタリングする
export function filterAfterStepsSections(
  sections: LoadedOrchestratorSection[],
): LoadedOrchestratorSection[] {
  return sections.filter((s) => s.position === "after-steps");
}

// before-steps と before-step:* の両方をフィルタリングする（Agent用: stepsがないためまとめて配置）
export function filterAllBeforeSections(
  sections: LoadedOrchestratorSection[],
): LoadedOrchestratorSection[] {
  return sections.filter(
    (s) =>
      s.position === "before-steps" || s.position.startsWith("before-step:"),
  );
}

// after-steps と after-step:* の両方をフィルタリングする（Agent用: stepsがないためまとめて配置）
export function filterAllAfterSections(
  sections: LoadedOrchestratorSection[],
): LoadedOrchestratorSection[] {
  return sections.filter(
    (s) =>
      s.position === "after-steps" || s.position.startsWith("after-step:"),
  );
}

// ステップ数の範囲外のindexを持つstep間セクションをフィルタリングする
export function filterOutOfRangeStepSections(
  sections: LoadedOrchestratorSection[],
  stepCount: number,
): LoadedOrchestratorSection[] {
  return sections.filter((s) => {
    const parsed = parseStepPosition(s.position);
    if (!parsed) return false;
    return parsed.index < 0 || parsed.index >= stepCount;
  });
}
