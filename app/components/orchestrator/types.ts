// --- 型定義 ---

// サポートファイルの内容マップ（filename → content）
export type SupportFileMap = Record<string, string>;

// インラインステップのサブステップ（構造化表示用）
export interface InlineSubStepFields {
  id: string;
  title: string;
  body: string;
}

export interface TeammateFields {
  name: string;
  role: string;
  steps?: InlineSubStepFields[];
  duties?: string[]; // リーダーなど担当ベースの記述用
}

// オーケストレーターのステップ（再帰構造をフラットに展開済み）
export interface StepFields {
  type: "skill" | "inline" | "branch" | "worker";
  label: string;
  description?: string;
  body?: string;
  cases?: { name: string; steps: StepFields[] }[];
  inlineSteps?: InlineSubStepFields[];
}

// セクション（位置なしのシンプル構造）
export interface SectionFields {
  heading: string;
  body: string;
}

// スキル詳細データ（全スキルタイプ共通）
export interface SkillDetailData {
  name: string;
  description: string | null;
  input: string[];
  output: string[];
  allowedTools: string[] | null;
  steps: StepFields[] | null;
  beforeSections: SectionFields[] | null;
  afterSections: SectionFields[] | null;
  teammates: TeammateFields[] | null;
  supportFiles: SupportFileMap;
}
