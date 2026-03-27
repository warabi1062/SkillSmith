// オーケストレーター（EntryPointSkill）の content を steps + sections + メタデータから自動生成する

import type { LoadedStep, LoadedOrchestratorSection } from "../types/loader.server";
import { isLoadedBranch, isLoadedInlineStep } from "../types/loader.server";
import type { LoadedBranch, LoadedInlineStep } from "../types/loader.server";
import { serializeToolRef } from "../types/skill";

export interface OrchestratorContentInput {
  name: string;
  description?: string;
  steps: LoadedStep[];
  sections?: LoadedOrchestratorSection[];
  // スキル名 → description のマップ（Worker skillの説明を参照するため）
  skillDescriptions?: Map<string, string>;
}

// セクションのpositionを解析するヘルパー
function parseStepPosition(position: string): { type: "before-step" | "after-step"; index: number } | null {
  const match = position.match(/^(before-step|after-step):(\d+)$/);
  if (!match) return null;
  return { type: match[1] as "before-step" | "after-step", index: Number(match[2]) };
}

// 指定positionのセクションをレンダリングするヘルパー
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

// step間セクションを含むステップ列をレンダリングする
function renderStepsWithSections(
  steps: LoadedStep[],
  sections: LoadedOrchestratorSection[],
  skillDescriptions?: Map<string, string>,
): string {
  const lines: string[] = [];
  const stepCount = steps.length;

  for (let i = 0; i < stepCount; i++) {
    const step = steps[i];
    const stepNumber = `${i + 1}`;

    // before-step:{i} セクション
    const beforeStepSections = sections.filter(s => {
      const parsed = parseStepPosition(s.position);
      return parsed?.type === "before-step" && parsed.index === i;
    });
    lines.push(...renderSections(beforeStepSections));

    // ステップ本体
    if (i > 0) lines.push("");
    if (isLoadedBranch(step)) {
      lines.push(renderBranch(step, stepNumber, skillDescriptions));
    } else if (isLoadedInlineStep(step)) {
      lines.push(renderInlineStep(step, stepNumber));
    } else {
      lines.push(renderSkillRef(step, stepNumber, skillDescriptions));
    }

    // after-step:{i} セクション
    const afterStepSections = sections.filter(s => {
      const parsed = parseStepPosition(s.position);
      return parsed?.type === "after-step" && parsed.index === i;
    });
    lines.push(...renderSections(afterStepSections));
  }

  // 範囲外indexのセクションはafter-stepsにフォールバック（呼び出し元で処理）
  return lines.join("\n");
}

// 範囲外indexのstep間セクションを収集するヘルパー
function getOutOfRangeStepSections(sections: LoadedOrchestratorSection[], stepCount: number): LoadedOrchestratorSection[] {
  return sections.filter(s => {
    const parsed = parseStepPosition(s.position);
    if (!parsed) return false;
    return parsed.index < 0 || parsed.index >= stepCount;
  });
}

export function generateOrchestratorContent(input: OrchestratorContentInput): string {
  const lines: string[] = [];

  // ヘッダー
  lines.push(`# ${input.name}`);
  if (input.description) {
    lines.push("");
    lines.push(input.description);
  }

  // before-steps セクション
  const beforeSections = input.sections?.filter(s => s.position === "before-steps") ?? [];
  for (const section of beforeSections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }

  // ステップ（step間セクション含む）
  if (input.steps.length > 0) {
    lines.push("");
    lines.push("## ステップ");
    lines.push("");

    // step間セクションを抽出
    const stepSections = input.sections?.filter(s => {
      const parsed = parseStepPosition(s.position);
      return parsed !== null;
    }) ?? [];

    const stepLines = renderStepsWithSections(input.steps, stepSections, input.skillDescriptions);
    lines.push(stepLines);
  }

  // after-steps セクション + 範囲外indexのフォールバック
  const afterSections = input.sections?.filter(s => s.position === "after-steps") ?? [];
  const outOfRange = getOutOfRangeStepSections(input.sections ?? [], input.steps.length);
  for (const section of [...afterSections, ...outOfRange]) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }

  return lines.join("\n");
}

// ステップを再帰的にレンダリングする
function renderSteps(
  steps: LoadedStep[],
  prefix: string,
  skillDescriptions?: Map<string, string>,
): string {
  const lines: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNumber = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;

    if (isLoadedBranch(step)) {
      lines.push(renderBranch(step, stepNumber, skillDescriptions));
    } else if (isLoadedInlineStep(step)) {
      lines.push(renderInlineStep(step, stepNumber));
    } else {
      // スキル参照ステップ（string）
      lines.push(renderSkillRef(step, stepNumber, skillDescriptions));
    }
  }

  return lines.join("\n\n");
}

// スキル参照ステップのレンダリング
function renderSkillRef(
  skillName: string,
  stepNumber: string,
  skillDescriptions?: Map<string, string>,
): string {
  const desc = skillDescriptions?.get(skillName);
  if (desc) {
    return `### Step ${stepNumber}: ${skillName}\n\n${desc}`;
  }
  return `### Step ${stepNumber}: ${skillName}`;
}

// InlineStep のレンダリング
function renderInlineStep(step: LoadedInlineStep, stepNumber: string): string {
  const lines: string[] = [];
  lines.push(`### Step ${stepNumber}: ${step.inline}`);

  // 使用ツール
  if (step.tools && step.tools.length > 0) {
    lines.push("");
    lines.push(`**使用ツール**: ${step.tools.map(serializeToolRef).join(", ")}`);
  }

  if (step.input) {
    lines.push("");
    lines.push(`**入力**: ${step.input}`);
  }
  if (step.output) {
    lines.push("");
    lines.push(`**出力**: ${step.output}`);
  }

  // 構造化された手順ステップ
  if (step.steps.length > 0) {
    lines.push("");
    lines.push("#### 手順");
    for (const subStep of step.steps) {
      lines.push("");
      lines.push(`**${subStep.id}. ${subStep.title}**`);
      lines.push("");
      lines.push(subStep.body);
    }
  }

  return lines.join("\n");
}

// Branch のレンダリング
function renderBranch(
  branch: LoadedBranch,
  stepNumber: string,
  skillDescriptions?: Map<string, string>,
): string {
  const lines: string[] = [];
  lines.push(`### Step ${stepNumber}: ${branch.decisionPoint}`);

  if (branch.description) {
    lines.push("");
    lines.push(branch.description);
  }

  for (const [caseName, caseSteps] of Object.entries(branch.cases)) {
    lines.push("");
    lines.push(`#### ${caseName}`);
    if (caseSteps.length > 0) {
      lines.push("");
      lines.push(renderSteps(caseSteps, stepNumber, skillDescriptions));
    }
  }

  return lines.join("\n");
}
