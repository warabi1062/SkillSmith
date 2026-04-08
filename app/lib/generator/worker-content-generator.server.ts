// Worker の content を workerSteps + beforeSections/afterSections から自動生成する

import type {
  LoadedWorkerStep,
  LoadedSection,
} from "../types/loaded";
import {
  renderListSection,
  renderSections,
} from "../core/section-utils";
export interface WorkerContentInput {
  input?: string[]; // 入力の説明
  output?: string[]; // 出力の説明
  workerSteps: LoadedWorkerStep[]; // 手順ステップ
  beforeSections?: LoadedSection[]; // 手順前の追加セクション
  afterSections?: LoadedSection[]; // 手順後の追加セクション
}

export function generateWorkerContent(input: WorkerContentInput): string {
  const lines: string[] = [];

  // 入力セクション
  lines.push(...renderListSection("入力", input.input));

  // beforeSections
  if (input.beforeSections && input.beforeSections.length > 0) {
    lines.push(...renderSections(input.beforeSections));
  }

  // 手順セクション
  const stepCount = input.workerSteps.length;
  if (stepCount > 0) {
    lines.push("");
    lines.push("## 手順");

    for (let i = 0; i < stepCount; i++) {
      const step = input.workerSteps[i];
      lines.push("");
      lines.push(`### ${step.id}. ${step.title}`);
      lines.push("");
      lines.push(step.body);
    }
  }

  // afterSections
  if (input.afterSections && input.afterSections.length > 0) {
    for (const section of input.afterSections) {
      lines.push("");
      lines.push(`## ${section.heading}`);
      lines.push("");
      lines.push(section.body);
    }
  }

  // 出力セクション
  lines.push(...renderListSection("出力", input.output));

  return lines.join("\n");
}
