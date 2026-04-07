import type { SectionPosition, CommunicationPattern } from "../../lib/types/skill";

// --- 型定義 ---

// AgentConfigのセクション（構造化表示用）
interface AgentConfigSectionFields {
  heading: string;
  body: string;
  position: SectionPosition;
}

export interface AgentConfigFields {
  model: string;
  tools: string[];
  agentContent: string;
  description?: string;
  sections?: AgentConfigSectionFields[];
}

// サポートファイルの内容マップ（filename → content）
export type SupportFileMap = Record<string, string>;

// Workerのステップ（構造化表示用）
export interface WorkerStepFields {
  id: string;
  title: string;
  body: string;
}

export interface TeammateFields {
  name: string;
  role: string;
  steps: WorkerStepFields[];
  communicationPattern?: CommunicationPattern;
}

// インラインステップのサブステップ（構造化表示用）
interface InlineSubStepFields {
  id: string;
  title: string;
  body: string;
}

// オーケストレーターのステップ（再帰構造をフラットに展開済み）
export interface StepFields {
  type: "skill" | "inline" | "branch";
  label: string;
  description?: string;
  cases?: { name: string; steps: StepFields[] }[];
  inlineSteps?: InlineSubStepFields[];
}

// オーケストレーターのセクション
export interface SectionFields {
  heading: string;
  body: string;
  position: SectionPosition;
}

// スキル詳細データ
export interface SkillDetailData {
  name: string;
  description: string | null;
  skillType: string;
  content: string;
  input: string[];
  output: string[];
  allowedTools: string[] | null;
  steps: StepFields[] | null;
  sections: SectionFields[] | null;
  agentConfig: AgentConfigFields | null;
  workerSteps: WorkerStepFields[] | null;
  workerSections: SectionFields[] | null;
  teammates: TeammateFields[] | null;
  supportFiles: SupportFileMap;
}
