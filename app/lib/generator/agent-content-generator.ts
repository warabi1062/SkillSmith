// AgentConfig の content を description + sections から自動生成する

import type { LoadedOrchestratorSection } from "../types/loaded";
import {
  filterAllAfterSections,
  filterAllBeforeSections,
  renderListSection,
  renderSections,
} from "./section-utils";
import type { ContentGeneratorInput } from "./content-generator-types";

export interface AgentContentInput extends ContentGeneratorInput {
  skillName: string; // 対応するスキル名
  description?: string; // agentの説明
  sections?: LoadedOrchestratorSection[]; // 追加セクション
}

export function generateAgentContent(input: AgentContentInput): string {
  const lines: string[] = [];

  // 説明
  if (input.description) {
    lines.push(input.description);
  }

  // 入力セクション
  lines.push(...renderListSection("入力", input.input));

  // 出力セクション
  lines.push(...renderListSection("出力", input.output));

  // 実行セクション（対応するスキルへの委譲）
  if (lines.length > 0) lines.push("");
  lines.push("## 実行");
  lines.push("");
  lines.push(`${input.skillName} skill の手順に従って実行する。`);

  // before-steps セクション（before-step:* もbefore-stepsと同じ位置に配置）
  const beforeSections = filterAllBeforeSections(input.sections ?? []);
  lines.push(...renderSections(beforeSections));

  // after-steps セクション（after-step:* もafter-stepsと同じ位置に配置）
  const afterSections = filterAllAfterSections(input.sections ?? []);
  lines.push(...renderSections(afterSections));

  // description がない場合、先頭の空行を除去する
  while (lines.length > 0 && lines[0] === "") {
    lines.shift();
  }

  return lines.join("\n");
}
