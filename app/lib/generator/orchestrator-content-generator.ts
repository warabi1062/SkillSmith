// オーケストレーター（EntryPointSkill）の content を steps + sections + メタデータから自動生成する

import type { LoadedStep, LoadedOrchestratorSection } from "../types/loader.server";
import { isLoadedBranch, isLoadedInlineStep } from "../types/loader.server";
import type { LoadedBranch, LoadedInlineStep } from "../types/loader.server";

export interface OrchestratorContentInput {
  name: string;
  description?: string;
  steps: LoadedStep[];
  sections?: LoadedOrchestratorSection[];
  // スキル名 → description のマップ（Worker skillの説明を参照するため）
  skillDescriptions?: Map<string, string>;
}

// step間セクションの position をパースする
// "before-step:2" → { type: "before-step", index: 2 }
// "after-step:0" → { type: "after-step", index: 0 }
// "before-steps" / "after-steps" → null（step間ではない）
function parseStepPosition(position: string): { type: "before-step" | "after-step"; index: number } | null {
  const match = position.match(/^(before-step|after-step):(\d+)$/);
  if (!match) return null;
  return { type: match[1] as "before-step" | "after-step", index: Number(match[2]) };
}

// セクションをレンダリングするヘルパー
function renderSection(section: LoadedOrchestratorSection): string {
  return `## ${section.heading}\n\n${section.body}`;
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
    lines.push(renderSection(section));
  }

  // ステップ（step間セクションを含む）
  if (input.steps.length > 0) {
    lines.push("");
    lines.push("## ステップ");
    lines.push("");
    const stepLines = renderStepsWithSections(input.steps, input.sections, input.skillDescriptions);
    lines.push(stepLines);
  }

  // after-steps セクション
  const afterSections = input.sections?.filter(s => s.position === "after-steps") ?? [];
  // 範囲外の step index を持つセクションも after-steps にフォールバック
  const fallbackSections = input.sections?.filter(s => {
    const parsed = parseStepPosition(s.position);
    return parsed !== null && parsed.index >= input.steps.length;
  }) ?? [];
  for (const section of [...afterSections, ...fallbackSections]) {
    lines.push("");
    lines.push(renderSection(section));
  }

  return lines.join("\n");
}

// トップレベルステップをstep間セクション付きでレンダリングする
function renderStepsWithSections(
  steps: LoadedStep[],
  sections?: LoadedOrchestratorSection[],
  skillDescriptions?: Map<string, string>,
): string {
  const lines: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    // before-step:i セクション
    const beforeStepSections = sections?.filter(s => {
      const parsed = parseStepPosition(s.position);
      return parsed?.type === "before-step" && parsed.index === i;
    }) ?? [];
    for (const section of beforeStepSections) {
      lines.push(renderSection(section));
      lines.push("");
    }

    // ステップ本体
    const step = steps[i];
    const stepNumber = `${i + 1}`;

    if (isLoadedBranch(step)) {
      lines.push(renderBranch(step, stepNumber, skillDescriptions));
    } else if (isLoadedInlineStep(step)) {
      lines.push(renderInlineStep(step, stepNumber));
    } else {
      lines.push(renderSkillRef(step, stepNumber, skillDescriptions));
    }

    // after-step:i セクション
    const afterStepSections = sections?.filter(s => {
      const parsed = parseStepPosition(s.position);
      return parsed?.type === "after-step" && parsed.index === i;
    }) ?? [];
    for (const section of afterStepSections) {
      lines.push("");
      lines.push(renderSection(section));
    }

    if (i < steps.length - 1) {
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ステップを再帰的にレンダリングする（Branch内部のネスト用、step間セクションなし）
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

  if (step.description) {
    lines.push("");
    lines.push(step.description);
  }
  if (step.input) {
    lines.push("");
    lines.push(`**入力**: ${step.input}`);
  }
  if (step.output) {
    lines.push("");
    lines.push(`**出力**: ${step.output}`);
  }
  if (step.steps && step.steps.length > 0) {
    lines.push("");
    for (const [i, s] of step.steps.entries()) {
      lines.push(`${i + 1}. ${s}`);
    }
  }
  if (step.tools && step.tools.length > 0) {
    lines.push("");
    lines.push(`**使用ツール**: ${step.tools.join(", ")}`);
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
