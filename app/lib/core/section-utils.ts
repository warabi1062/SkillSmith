// セクション関連の共有ユーティリティ（orchestrator / worker で共通利用）

import type { LoadedSection } from "../types/loaded";

// セクションをレンダリングするヘルパー
export function renderSections(
  sections: LoadedSection[],
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

// リスト形式のセクションをレンダリングするヘルパー（入力・出力セクション等の共通処理）
// items が空または undefined の場合は空配列を返す
export function renderListSection(
  heading: string,
  items: string[] | undefined,
): string[] {
  if (!items?.length) return [];
  return ["", `## ${heading}`, "", ...items.map((item) => `- ${item}`)];
}
