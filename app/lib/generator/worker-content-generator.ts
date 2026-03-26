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

// セクションのpositionを解析するヘルパー
function parseStepPosition(position: string): { type: "before-step" | "after-step"; index: number } | null {
  const match = position.match(/^(before-step|after-step):(\d+)$/);
  if (!match) return null;
  return { type: match[1] as "before-step" | "after-step", index: Number(match[2]) };
}

// セクションをレンダリングするヘルパー
function renderSections(sections: LoadedOrchestratorSection[]): string[] {
  const lines: string[] = [];
  for (const section of sections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }
  return lines;
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

  // 手順セクション（step間セクション含む）
  const stepCount = input.workerSteps.length;
  if (stepCount > 0) {
    lines.push("");
    lines.push("## 手順");

    for (let i = 0; i < stepCount; i++) {
      const step = input.workerSteps[i];

      // before-step:{i} セクション
      const beforeStepSections = input.workerSections?.filter(s => {
        const parsed = parseStepPosition(s.position);
        return parsed?.type === "before-step" && parsed.index === i;
      }) ?? [];
      lines.push(...renderSections(beforeStepSections));

      lines.push("");
      lines.push(`### ${step.id}. ${step.title}`);
      lines.push("");
      lines.push(step.body);

      // after-step:{i} セクション
      const afterStepSections = input.workerSections?.filter(s => {
        const parsed = parseStepPosition(s.position);
        return parsed?.type === "after-step" && parsed.index === i;
      }) ?? [];
      lines.push(...renderSections(afterStepSections));
    }
  }

  // after-steps セクション + 範囲外indexのフォールバック
  const afterSections = input.workerSections?.filter(s => s.position === "after-steps") ?? [];
  const outOfRange = input.workerSections?.filter(s => {
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
  if (input.output) {
    lines.push("");
    lines.push("## 出力");
    lines.push("");
    lines.push(input.output);
  }

  return lines.join("\n");
}
