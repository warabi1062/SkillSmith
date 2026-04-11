import type {
  LoadedSkillUnion,
  LoadedStep,
  LoadedBranch,
  LoadedInlineStep,
  LoadedSection,
} from "../../lib/types/loaded";
import { isLoadedSkillRef } from "../../lib/types/loaded";
import { serializeToolRef } from "../../lib/types/skill";
import { SKILL_TYPES } from "../../lib/types/constants";
import type { StepFields, SectionFields, SkillDetailData } from "./types";

// --- データ変換関数 ---

// LoadedStep -> StepFields 変換（型ガードはランタイム判定）
export function convertStep(step: LoadedStep): StepFields {
  if (isLoadedSkillRef(step)) {
    return { type: "skill", label: step.skillName };
  }
  if ("decisionPoint" in step && "cases" in step) {
    const branch = step as LoadedBranch;
    return {
      type: "branch",
      label: branch.decisionPoint,
      description: branch.description,
      cases: Object.entries(branch.cases).map(([name, steps]) => ({
        name,
        steps: steps.map(convertStep),
      })),
    };
  }
  const inline = step as LoadedInlineStep;
  return {
    type: "inline",
    label: inline.inline,
    inlineSteps: inline.steps.map((s) => ({
      id: s.id,
      title: s.title,
      body: s.body,
    })),
  };
}

export function convertSections(sections: LoadedSection[]): SectionFields[] {
  return sections.map((s) => ({
    heading: s.heading,
    body: s.body,
  }));
}

// --- skill情報の組み立て ---

export function buildSkillDetailData(skill: LoadedSkillUnion): SkillDetailData {
  // stepsの統合: EntryPointはstepsをそのまま変換、WorkerはworkerStepsをinline StepFieldsに変換
  let steps: StepFields[] | null = null;

  if (skill.steps) {
    steps = skill.steps.map(convertStep);
  } else if (
    (skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT ||
      skill.skillType === SKILL_TYPES.WORKER) &&
    skill.workerSteps &&
    skill.workerSteps.length > 0
  ) {
    // workerStepsをworker型のStepFieldsに変換
    steps = skill.workerSteps.map((ws) => ({
      type: "worker" as const,
      label: ws.title,
      body: ws.body,
    }));
  }

  const teammatesData =
    skill.skillType === SKILL_TYPES.WORKER_WITH_AGENT_TEAM && skill.teammates
      ? skill.teammates.map((t) => ({
          name: t.name,
          role: t.role,
          steps: t.steps.map((s) => ({
            id: s.id,
            title: s.title,
            body: s.body,
          })),
        }))
      : null;

  return {
    name: skill.name,
    description: skill.description ?? null,
    input: skill.input ?? [],
    output: skill.output ?? [],
    allowedTools: skill.allowedTools
      ? skill.allowedTools.map(serializeToolRef)
      : null,
    steps,
    beforeSections: skill.beforeSections
      ? convertSections(skill.beforeSections)
      : null,
    afterSections: skill.afterSections
      ? convertSections(skill.afterSections)
      : null,
    teammates: teammatesData,
    supportFiles: Object.fromEntries(
      (skill.files ?? []).map((f) => [f.filename, f.content]),
    ),
  };
}
