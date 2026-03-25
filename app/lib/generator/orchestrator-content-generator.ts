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

  // ステップ
  if (input.steps.length > 0) {
    lines.push("");
    lines.push("## ステップ");
    lines.push("");
    const stepLines = renderSteps(input.steps, "", input.skillDescriptions);
    lines.push(stepLines);
  }

  // after-steps セクション
  const afterSections = input.sections?.filter(s => s.position === "after-steps") ?? [];
  for (const section of afterSections) {
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
