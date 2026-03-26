// サイドパネル共通の型定義

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
