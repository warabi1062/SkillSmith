// AgentConfig の content を description + sections から自動生成する

import type { LoadedAgentConfigSection } from "../types/loader.server";

export interface AgentContentInput {
  skillName: string; // 対応するスキル名
  description?: string; // agentの説明
  input?: string[]; // 入力の説明
  output?: string[]; // 出力の説明
  sections?: LoadedAgentConfigSection[]; // 追加セクション
}

export function generateAgentContent(input: AgentContentInput): string {
  const lines: string[] = [];

  // 説明
  if (input.description) {
    lines.push(input.description);
  }

  // 入力セクション
  if (input.input?.length) {
    if (lines.length > 0) lines.push("");
    lines.push("## 入力");
    lines.push("");
    lines.push(...input.input.map((item) => `- ${item}`));
  }

  // 出力セクション
  if (input.output?.length) {
    if (lines.length > 0) lines.push("");
    lines.push("## 出力");
    lines.push("");
    lines.push(...input.output.map((item) => `- ${item}`));
  }

  // 実行セクション（対応するスキルへの委譲）
  if (lines.length > 0) lines.push("");
  lines.push("## 実行");
  lines.push("");
  lines.push(`${input.skillName} skill の手順に従って実行する。`);

  // before-steps セクション（before-step:* もbefore-stepsと同じ位置に配置）
  const beforeSections =
    input.sections?.filter(
      (s) =>
        s.position === "before-steps" || s.position.startsWith("before-step:"),
    ) ?? [];
  for (const section of beforeSections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }

  // after-steps セクション（after-step:* もafter-stepsと同じ位置に配置）
  const afterSections =
    input.sections?.filter(
      (s) =>
        s.position === "after-steps" || s.position.startsWith("after-step:"),
    ) ?? [];
  for (const section of afterSections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }

  return lines.join("\n");
}
