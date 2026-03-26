// WorkerWithSubAgent の content を workerSteps + workerSections から自動生成する

import type { LoadedWorkerStep, LoadedOrchestratorSection } from "../types/loader.server";

export interface WorkerContentInput {
  name: string;                          // スキル名
  description?: string;                  // スキルの説明
  input?: string;                        // 入力の説明
  output?: string;                       // 出力の説明
  workerSteps: LoadedWorkerStep[];       // 手順ステップ
  workerSections?: LoadedOrchestratorSection[];  // steps前後の追加セクション
}

export function generateWorkerContent(input: WorkerContentInput): string {
  const lines: string[] = [];

  // ヘッダー
  lines.push(`# ${input.name}`);
  if (input.description) {
    lines.push("");
    lines.push(input.description);
  }

  // 入力セクション
  if (input.input) {
    lines.push("");
    lines.push("## 入力");
    lines.push("");
    lines.push(input.input);
  }

  // before-steps セクション
  const beforeSections = input.workerSections?.filter(s => s.position === "before-steps") ?? [];
  for (const section of beforeSections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }

  // 手順セクション
  if (input.workerSteps.length > 0) {
    lines.push("");
    lines.push("## 手順");

    for (const step of input.workerSteps) {
      lines.push("");
      lines.push(`### ${step.id}. ${step.title}`);
      lines.push("");
      lines.push(step.body);
    }
  }

  // after-steps セクション
  const afterSections = input.workerSections?.filter(s => s.position === "after-steps") ?? [];
  for (const section of afterSections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }

  // 出力セクション
  if (input.output) {
    lines.push("");
    lines.push("## 出力");
    lines.push("");
    lines.push(input.output);
  }

  return lines.join("\n");
}
