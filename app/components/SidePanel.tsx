// サイドパネルの型定義とcomponentTypeによるスイッチ

import OrchestratorSidePanel from "./side-panel/OrchestratorSidePanel";
import SkillSidePanel from "./side-panel/SkillSidePanel";
import InlineSidePanel from "./side-panel/InlineSidePanel";

// --- 型定義（外部からimportされるためここで維持） ---

// AgentConfigのセクション（構造化表示用）
export interface AgentConfigSectionFields {
  heading: string;
  body: string;
  position: "before-steps" | "after-steps";
}

export interface AgentConfigFields {
  model: string;
  tools: string[];
  agentContent: string;
  description?: string;
  sections?: AgentConfigSectionFields[];
}

// Workerのステップ（構造化表示用）
export interface WorkerStepFields {
  id: string;
  title: string;
  body: string;
}

export interface TeammateFields {
  name: string;
  role: string;
  steps: { id: string; title: string; body: string }[];
  pollingTarget?: string;
  statusCheckResponder?: boolean;
}

// インラインステップのサブステップ（構造化表示用）
export interface InlineSubStepFields {
  id: string;
  title: string;
  body: string;
}

// オーケストレーターのステップ（再帰構造をフラットに展開済み）
export interface StepFields {
  type: "skill" | "inline" | "branch";
  label: string;
  description?: string;           // branch の判定条件説明用
  cases?: { name: string; steps: StepFields[] }[];
  inlineSteps?: InlineSubStepFields[];
  inlineTools?: string[];
}

// オーケストレーターのセクション
export interface SectionFields {
  heading: string;
  body: string;
  position: "before-steps" | "after-steps";
}

// --- Props（後方互換） ---

export interface SidePanelProps {
  componentType: "SKILL" | "ORCHESTRATOR" | "INLINE";
  name: string;
  description: string | null;
  content: string;
  input: string;
  output: string;
  skillType: string | null;
  allowedTools: string | null;
  argumentHint: string | null;
  hasAgentConfig: boolean;
  inlineSteps: InlineSubStepFields[] | null;
  inlineTools: string[] | null;
  agentConfig: AgentConfigFields | null;
  teammates: TeammateFields[] | null;
  workerSteps: WorkerStepFields[] | null;
  workerSections: SectionFields[] | null;
  steps: StepFields[] | null;
  sections: SectionFields[] | null;
  onClose: () => void;
}

// --- componentType による振り分け ---

export default function SidePanel(props: SidePanelProps) {
  switch (props.componentType) {
    case "ORCHESTRATOR":
      return (
        <OrchestratorSidePanel
          name={props.name}
          description={props.description}
          content={props.content}
          input={props.input}
          output={props.output}
          skillType={props.skillType}
          allowedTools={props.allowedTools}
          argumentHint={props.argumentHint}
          steps={props.steps}
          sections={props.sections}
          onClose={props.onClose}
        />
      );
    case "INLINE":
      return (
        <InlineSidePanel
          name={props.name}
          description={props.description}
          content={props.content}
          input={props.input}
          output={props.output}
          inlineSteps={props.inlineSteps}
          inlineTools={props.inlineTools}
          onClose={props.onClose}
        />
      );
    case "SKILL":
      return (
        <SkillSidePanel
          name={props.name}
          description={props.description}
          content={props.content}
          input={props.input}
          output={props.output}
          skillType={props.skillType}
          allowedTools={props.allowedTools}
          hasAgentConfig={props.hasAgentConfig}
          agentConfig={props.agentConfig}
          teammates={props.teammates}
          workerSteps={props.workerSteps}
          workerSections={props.workerSections}
          onClose={props.onClose}
        />
      );
  }
}
