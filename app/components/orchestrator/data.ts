import type {
  LoadedSkillUnion,
  LoadedStep,
  LoadedBranch,
  LoadedInlineStep,
  LoadedOrchestratorSection,
} from "../../lib/types/loaded";
import { isLoadedSkillRef } from "../../lib/types/loaded";
import { serializeToolRef } from "../../lib/types/skill";
import { SKILL_TYPES } from "../../lib/types/constants";
import type {
  StepFields,
  SectionFields,
  SkillDetailData,
} from "./types";

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

export function convertSections(
  sections: LoadedOrchestratorSection[],
): SectionFields[] {
  return sections.map((s) => ({
    heading: s.heading,
    body: s.body,
    position: s.position,
  }));
}

// --- skill情報の組み立て ---

export function buildSkillDetailData(skill: LoadedSkillUnion): SkillDetailData {
  const agentConfigData =
    skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT ? skill.agentConfig : null;

  const workerStepsData =
    (skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT || skill.skillType === SKILL_TYPES.WORKER) && skill.workerSteps
      ? skill.workerSteps.map((s) => ({
          id: s.id,
          title: s.title,
          body: s.body,
        }))
      : null;

  const workerSectionsData =
    (skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT || skill.skillType === SKILL_TYPES.WORKER) && skill.workerSections
      ? skill.workerSections.map((s) => ({
          heading: s.heading,
          body: s.body,
          position: s.position,
        }))
      : null;

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
          communicationPattern: t.communicationPattern,
        }))
      : null;

  return {
    name: skill.name,
    description: skill.description ?? null,
    skillType: skill.skillType,
    content: skill.content ?? "",
    input: skill.input ?? [],
    output: skill.output ?? [],
    allowedTools: skill.allowedTools
      ? skill.allowedTools.map(serializeToolRef)
      : null,
    steps: skill.steps ? skill.steps.map(convertStep) : null,
    sections: skill.sections
      ? convertSections(skill.sections as LoadedOrchestratorSection[])
      : null,
    agentConfig: agentConfigData
      ? {
          model: agentConfigData.model ?? "",
          tools: (agentConfigData.tools ?? []).map(serializeToolRef),
          agentContent: agentConfigData.content ?? "",
          description: agentConfigData.description,
          sections: agentConfigData.sections?.map((s) => ({
            heading: s.heading,
            body: s.body ?? "",
            position: s.position,
          })),
        }
      : null,
    workerSteps: workerStepsData,
    workerSections: workerSectionsData,
    teammates: teammatesData,
    supportFiles: Object.fromEntries(
      (skill.files ?? []).map((f) => [f.filename, f.content]),
    ),
  };
}
