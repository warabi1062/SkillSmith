// WorkerWithSubAgent の content を workerSteps + workerSections から自動生成する

import type {
  LoadedWorkerStep,
  LoadedOrchestratorSection,
} from "../types/loaded";
import { parseStepPosition, renderSections } from "./section-utils";
import type { ContentGeneratorInput } from "./content-generator-types";

export interface WorkerContentInput extends ContentGeneratorInput {
  workerSteps: LoadedWorkerStep[]; // 手順ステップ
  workerSections?: LoadedOrchestratorSection[]; // steps前後の追加セクション
}

export function generateWorkerContent(input: WorkerContentInput): string {
  const lines: string[] = [];

  // 入力セクション
  if (input.input?.length) {
    lines.push("");
    lines.push("## 入力");
    lines.push("");
    lines.push(...input.input.map((item) => `- ${item}`));
  }

  // before-steps セクション
  const beforeSections =
    input.workerSections?.filter((s) => s.position === "before-steps") ?? [];
  for (const section of beforeSections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }

  // 手順セクション（step間セクション含む）
  const stepCount = input.workerSteps.length;
  if (stepCount > 0) {
    lines.push("");
    lines.push("## 手順");

    for (let i = 0; i < stepCount; i++) {
      const step = input.workerSteps[i];

      // before-step:{i} セクション
      const beforeStepSections =
        input.workerSections?.filter((s) => {
          const parsed = parseStepPosition(s.position);
          return parsed?.type === "before-step" && parsed.index === i;
        }) ?? [];
      lines.push(...renderSections(beforeStepSections));

      lines.push("");
      lines.push(`### ${step.id}. ${step.title}`);
      lines.push("");
      lines.push(step.body);

      // after-step:{i} セクション
      const afterStepSections =
        input.workerSections?.filter((s) => {
          const parsed = parseStepPosition(s.position);
          return parsed?.type === "after-step" && parsed.index === i;
        }) ?? [];
      lines.push(...renderSections(afterStepSections));
    }
  }

  // after-steps セクション + 範囲外indexのフォールバック
  const afterSections =
    input.workerSections?.filter((s) => s.position === "after-steps") ?? [];
  const outOfRange =
    input.workerSections?.filter((s) => {
      const parsed = parseStepPosition(s.position);
      if (!parsed) return false;
      return parsed.index < 0 || parsed.index >= stepCount;
    }) ?? [];
  for (const section of [...afterSections, ...outOfRange]) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }

  // 出力セクション
  if (input.output?.length) {
    lines.push("");
    lines.push("## 出力");
    lines.push("");
    lines.push(...input.output.map((item) => `- ${item}`));
  }

  return lines.join("\n");
}
