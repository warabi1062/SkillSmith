import type { CommunicationPattern } from "../../lib/types/skill";

// --- 型定義 ---

// AgentConfigのセクション（構造化表示用）
interface AgentConfigSectionFields {
  heading: string;
  body: string;
}

export interface AgentConfigFields {
  model: string;
  tools: string[];
  agentContent: string;
  description?: string;
  beforeSections?: AgentConfigSectionFields[];
  afterSections?: AgentConfigSectionFields[];
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

// セクション（位置なしのシンプル構造）
export interface SectionFields {
  heading: string;
  body: string;
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
  beforeSections: SectionFields[] | null;
  afterSections: SectionFields[] | null;
  agentConfig: AgentConfigFields | null;
  workerSteps: WorkerStepFields[] | null;
  teammates: TeammateFields[] | null;
  supportFiles: SupportFileMap;
}
