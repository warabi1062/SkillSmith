// AgentConfig の content を description + beforeSections/afterSections から自動生成する

import type { LoadedSection } from "../types/loaded";
import {
  renderListSection,
  renderSections,
} from "../core/section-utils";
import type { ContentGeneratorInput } from "./types";

export interface AgentContentInput extends ContentGeneratorInput {
  skillName: string; // 対応するスキル名
  description?: string; // agentの説明
  beforeSections?: LoadedSection[]; // 実行セクション前の追加セクション
  afterSections?: LoadedSection[]; // 実行セクション後の追加セクション
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

  // beforeSections（実行セクションの前に配置）
  if (input.beforeSections && input.beforeSections.length > 0) {
    lines.push(...renderSections(input.beforeSections));
  }

  // 実行セクション（対応するスキルへの委譲）
  if (lines.length > 0) lines.push("");
  lines.push("## 実行");
  lines.push("");
  lines.push(`${input.skillName} skill の手順に従って実行する。`);

  // afterSections（実行セクションの後に配置）
  if (input.afterSections && input.afterSections.length > 0) {
    lines.push(...renderSections(input.afterSections));
  }

  // description がない場合、先頭の空行を除去する
  while (lines.length > 0 && lines[0] === "") {
    lines.shift();
  }

  return lines.join("\n");
}
