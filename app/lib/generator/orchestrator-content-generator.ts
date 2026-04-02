// オーケストレーター（EntryPointSkill）の content を steps + sections + メタデータから自動生成する

import type {
  LoadedStep,
  LoadedOrchestratorSection,
} from "../types/loader.server";
import { isLoadedBranch, isLoadedInlineStep } from "../types/loader.server";
import type { LoadedBranch, LoadedInlineStep } from "../types/loader.server";


// スキル参照ステップで表示するメタ情報
export interface SkillMeta {
  input?: string[];
  output?: string[];
  hasAgent?: boolean; // WorkerWithSubAgent の場合 true
}

export interface OrchestratorContentInput {
  steps: LoadedStep[];
  sections?: LoadedOrchestratorSection[];
  // スキル名 → メタ情報のマップ（スキル参照ステップの入出力表示用）
  skillMetas?: Map<string, SkillMeta>;
}

// セクションのpositionを解析するヘルパー
function parseStepPosition(
  position: string,
): { type: "before-step" | "after-step"; index: number } | null {
  const match = position.match(/^(before-step|after-step):(\d+)$/);
  if (!match) return null;
  return {
    type: match[1] as "before-step" | "after-step",
    index: Number(match[2]),
  };
}

// markdownヘッダーを生成する（例: h(3) → "###"）
function h(level: number): string {
  return "#".repeat(level);
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
  skillMetas?: Map<string, SkillMeta>,
): string {
  const lines: string[] = [];
  const stepCount = steps.length;

  for (let i = 0; i < stepCount; i++) {
    const step = steps[i];
    const stepNumber = `${i + 1}`;

    // before-step:{i} セクション
    const beforeStepSections = sections.filter((s) => {
      const parsed = parseStepPosition(s.position);
      return parsed?.type === "before-step" && parsed.index === i;
    });
    lines.push(...renderSections(beforeStepSections));

    // ステップ本体
    if (i > 0) lines.push("");
    // トップレベルのステップは h3（「## ステップ」の直下）
    if (isLoadedBranch(step)) {
      lines.push(renderBranch(step, stepNumber, 3, skillMetas));
    } else if (isLoadedInlineStep(step)) {
      lines.push(renderInlineStep(step, stepNumber, 3));
    } else {
      lines.push(renderSkillRef(step, stepNumber, 3, skillMetas));
    }

    // after-step:{i} セクション
    const afterStepSections = sections.filter((s) => {
      const parsed = parseStepPosition(s.position);
      return parsed?.type === "after-step" && parsed.index === i;
    });
    lines.push(...renderSections(afterStepSections));
  }

  // 範囲外indexのセクションはafter-stepsにフォールバック（呼び出し元で処理）
  return lines.join("\n");
}

// 範囲外indexのstep間セクションを収集するヘルパー
function getOutOfRangeStepSections(
  sections: LoadedOrchestratorSection[],
  stepCount: number,
): LoadedOrchestratorSection[] {
  return sections.filter((s) => {
    const parsed = parseStepPosition(s.position);
    if (!parsed) return false;
    return parsed.index < 0 || parsed.index >= stepCount;
  });
}

export function generateOrchestratorContent(
  input: OrchestratorContentInput,
): string {
  const lines: string[] = [];

  // before-steps セクション
  const beforeSections =
    input.sections?.filter((s) => s.position === "before-steps") ?? [];
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
    const stepSections =
      input.sections?.filter((s) => {
        const parsed = parseStepPosition(s.position);
        return parsed !== null;
      }) ?? [];

    const stepLines = renderStepsWithSections(
      input.steps,
      stepSections,
      input.skillMetas,
    );
    lines.push(stepLines);
  }

  // after-steps セクション + 範囲外indexのフォールバック → 「## 補足説明」の下にまとめる
  const afterSections =
    input.sections?.filter((s) => s.position === "after-steps") ?? [];
  const outOfRange = getOutOfRangeStepSections(
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

// ステップを再帰的にレンダリングする（headingLevel: ステップ見出しのレベル）
function renderSteps(
  steps: LoadedStep[],
  prefix: string,
  headingLevel: number,
  skillMetas?: Map<string, SkillMeta>,
): string {
  const lines: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNumber = prefix ? `${prefix}-${i + 1}` : `${i + 1}`;

    if (isLoadedBranch(step)) {
      lines.push(renderBranch(step, stepNumber, headingLevel, skillMetas));
    } else if (isLoadedInlineStep(step)) {
      lines.push(renderInlineStep(step, stepNumber, headingLevel));
    } else {
      lines.push(renderSkillRef(step, stepNumber, headingLevel, skillMetas));
    }
  }

  return lines.join("\n\n");
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
    lines.push(`${h(headingLevel + 1)} 入力`);
    lines.push("");
    lines.push(...step.input.map((item) => `- ${item}`));
  }
  if (step.output?.length) {
    lines.push("");
    lines.push(`${h(headingLevel + 1)} 出力`);
    lines.push("");
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
        renderSteps(
          caseSteps,
          `${stepNumber}${caseSuffix}`,
          headingLevel + 2,
          skillMetas,
        ),
      );
    }
  }

  return lines.join("\n");
}
