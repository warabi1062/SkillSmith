// オーケストレーター（EntryPointSkill）の content を steps + sections + メタデータから自動生成する

import type {
  LoadedStep,
  LoadedOrchestratorSection,
} from "../types/loaded";
import { isLoadedBranch, isLoadedInlineStep } from "../types/loaded";
import type { LoadedBranch, LoadedInlineStep } from "../types/loaded";
import {
  filterAfterStepsSections,
  filterBeforeStepsSections,
  filterOutOfRangeStepSections,
  parseStepPosition,
  renderSections,
} from "../core/section-utils";
import type { ContentGeneratorInput } from "./types";


// スキル参照ステップで表示するメタ情報
export interface SkillMeta {
  input?: string[];
  output?: string[];
  hasAgent?: boolean; // WorkerWithSubAgent の場合 true
}

export interface OrchestratorContentInput extends ContentGeneratorInput {
  steps: LoadedStep[];
  sections?: LoadedOrchestratorSection[];
  // スキル名 → メタ情報のマップ（スキル参照ステップの入出力表示用）
  skillMetas?: Map<string, SkillMeta>;
}

// markdownヘッダーを生成する（例: h(3) → "###"）
function h(level: number): string {
  return "#".repeat(level);
}

// ステップ列をレンダリングする（トップレベル・Branch内ネスト兼用）
function renderSteps(
  steps: LoadedStep[],
  options: {
    prefix?: string;
    headingLevel: number;
    sections?: LoadedOrchestratorSection[];
    skillMetas?: Map<string, SkillMeta>;
  },
): string {
  const { prefix, headingLevel, sections, skillMetas } = options;
  const lines: string[] = [];
  const hasSections = sections != null && sections.length > 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNumber = prefix ? `${prefix}-${i + 1}` : `${i + 1}`;

    // before-step セクション（sectionsがある場合のみ）
    if (hasSections) {
      const beforeStepSections = sections.filter((s) => {
        const parsed = parseStepPosition(s.position);
        return parsed?.type === "before-step" && parsed.index === i;
      });
      lines.push(...renderSections(beforeStepSections));
    }

    // ステップ間の空行
    if (i > 0) lines.push("");

    // ステップ本体
    if (isLoadedBranch(step)) {
      lines.push(renderBranch(step, stepNumber, headingLevel, skillMetas));
    } else if (isLoadedInlineStep(step)) {
      lines.push(renderInlineStep(step, stepNumber, headingLevel));
    } else {
      lines.push(renderSkillRef(step.skillName, stepNumber, headingLevel, skillMetas));
    }

    // after-step セクション（sectionsがある場合のみ）
    if (hasSections) {
      const afterStepSections = sections.filter((s) => {
        const parsed = parseStepPosition(s.position);
        return parsed?.type === "after-step" && parsed.index === i;
      });
      lines.push(...renderSections(afterStepSections));
    }
  }

  return lines.join("\n");
}

export function generateOrchestratorContent(
  input: OrchestratorContentInput,
): string {
  const lines: string[] = [];

  // before-steps セクション
  const beforeSections = filterBeforeStepsSections(input.sections ?? []);
  for (const section of beforeSections) {
    lines.push("");
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
  }

  // ステップ（step間セクション含む）
  if (input.steps.length > 0) {
    lines.push("");
    lines.push("## 作業詳細");
    lines.push("");

    // step間セクションを抽出
    const stepSections =
      input.sections?.filter((s) => {
        const parsed = parseStepPosition(s.position);
        return parsed !== null;
      }) ?? [];

    const stepLines = renderSteps(input.steps, {
      headingLevel: 3,
      sections: stepSections,
      skillMetas: input.skillMetas,
    });
    lines.push(stepLines);
  }

  // after-steps セクション + 範囲外indexのフォールバック → 「## 補足説明」の下にまとめる
  const afterSections = filterAfterStepsSections(input.sections ?? []);
  const outOfRange = filterOutOfRangeStepSections(
    input.sections ?? [],
    input.steps.length,
  );
  const supplementSections = [...afterSections, ...outOfRange];
  if (supplementSections.length > 0) {
    lines.push("");
    lines.push("## 補足説明");
    for (const section of supplementSections) {
      lines.push("");
      lines.push(`### ${section.heading}`);
      lines.push("");
      lines.push(section.body);
    }
  }

  return lines.join("\n");
}

// スキル参照ステップのレンダリング
function renderSkillRef(
  skillName: string,
  stepNumber: string,
  headingLevel: number,
  skillMetas?: Map<string, SkillMeta>,
): string {
  const lines: string[] = [];
  const meta = skillMetas?.get(skillName);
  lines.push(`${h(headingLevel)} Step ${stepNumber}: ${skillName}`);
  lines.push("");
  if (meta?.hasAgent) {
    lines.push(
      `Task ツールを subagent_type: ${skillName}-agent で呼び出す。`,
    );
  } else {
    lines.push(`${skillName} skill を実行する。`);
  }
  if (meta) {
    if (meta.input?.length) {
      lines.push("");
      lines.push("渡す情報:");
      lines.push(...meta.input.map((item) => `- ${item}`));
    }
    if (meta.output?.length) {
      lines.push("");
      lines.push("出力:");
      lines.push(...meta.output.map((item) => `- ${item}`));
    }
  }

  return lines.join("\n");
}

// InlineStep のレンダリング
function renderInlineStep(
  step: LoadedInlineStep,
  stepNumber: string,
  headingLevel: number,
): string {
  const lines: string[] = [];
  lines.push(`${h(headingLevel)} Step ${stepNumber}: ${step.inline}`);

  // 構造化された手順ステップ（説明が先）
  if (step.steps.length === 1) {
    // ステップが1つだけの場合はフラットに展開
    lines.push("");
    lines.push(step.steps[0].body);
  } else if (step.steps.length > 1) {
    for (const subStep of step.steps) {
      lines.push("");
      lines.push(`${subStep.id}. ${subStep.title}`);
      lines.push("");
      lines.push(subStep.body);
    }
  }

  if (step.input?.length) {
    lines.push("");
    lines.push("入力:");
    lines.push(...step.input.map((item) => `- ${item}`));
  }
  if (step.output?.length) {
    lines.push("");
    lines.push("出力:");
    lines.push(...step.output.map((item) => `- ${item}`));
  }

  return lines.join("\n");
}

// Branch のレンダリング
function renderBranch(
  branch: LoadedBranch,
  stepNumber: string,
  headingLevel: number,
  skillMetas?: Map<string, SkillMeta>,
): string {
  const lines: string[] = [];
  lines.push(`${h(headingLevel)} Step ${stepNumber}: ${branch.decisionPoint}`);

  if (branch.description) {
    lines.push("");
    lines.push(branch.description);
  }

  const caseEntries = Object.entries(branch.cases);
  for (let ci = 0; ci < caseEntries.length; ci++) {
    const [caseName, caseSteps] = caseEntries[ci];
    // ケースにA, B, C...のサフィックスを付ける（例: Step 1A-1, Step 1B-1）
    const caseSuffix = String.fromCharCode(65 + ci); // A, B, C...
    lines.push("");
    lines.push(`${h(headingLevel + 1)} ${caseName}`);
    if (caseSteps.length > 0) {
      lines.push("");
      // ケース内のステップはケース見出し+1のレベル
      lines.push(
        renderSteps(caseSteps, {
          prefix: `${stepNumber}${caseSuffix}`,
          headingLevel: headingLevel + 2,
          skillMetas,
        }),
      );
    }
  }

  return lines.join("\n");
}
