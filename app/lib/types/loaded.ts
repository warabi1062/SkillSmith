// Loaded系型定義と型ガード
// ローダーが返す解決済みの型。ファイルシステムAPIを使用しないため .server.ts サフィックス不要

import type {
  ToolRef,
  SupportFileRole,
  AgentConfig,
  CommunicationPattern,
} from "./skill";
import { SKILL_TYPES } from "./constants";

// ローダーが返す型: SupportFile + 読み込んだ content
export interface LoadedSupportFile {
  role: SupportFileRole;
  filename: string;
  content: string;
  sortOrder?: number;
}

// ローダー用の分岐ステップ型（スキル名は文字列参照）
export interface LoadedBranch {
  decisionPoint: string;
  description?: string;
  cases: Record<string, LoadedStep[]>;
}

// ローダー用のインラインステップ型
export interface LoadedInlineStep {
  inline: string;
  steps: LoadedDelegateStep[];
  input?: string[];
  output?: string[];
}

// ローダー用のセクション型（body は正規化済み）
export interface LoadedSection {
  heading: string;
  body: string;
}

// スキル参照（オーケストレーターのステップからWorkerスキルを参照する）
export interface SkillRef {
  skillName: string;
}

export type LoadedStep = SkillRef | LoadedBranch | LoadedInlineStep;

// SkillRef かどうかを判定する型ガード
export function isLoadedSkillRef(step: LoadedStep): step is SkillRef {
  return (
    "skillName" in step && !("decisionPoint" in step) && !("inline" in step)
  );
}

// LoadedBranch かどうかを判定する型ガード
export function isLoadedBranch(step: LoadedStep): step is LoadedBranch {
  return "decisionPoint" in step && "cases" in step;
}

// LoadedInlineStep かどうかを判定する型ガード
export function isLoadedInlineStep(step: LoadedStep): step is LoadedInlineStep {
  return "inline" in step && !("decisionPoint" in step);
}

// ローダーが返すスキルの共通フィールド
interface LoadedSkillBase {
  name: string;
  description?: string;
  input?: string[];
  output?: string[];
  allowedTools?: ToolRef[];
  argumentHint?: string;
  userInvocable?: boolean;
  disableModelInvocation?: boolean;
  files: LoadedSupportFile[];
  dependencies?: string[];
  steps?: LoadedStep[];
  beforeSections?: LoadedSection[];
  afterSections?: LoadedSection[];
}

// ENTRY_POINT / WORKER の場合
export interface LoadedSkill extends LoadedSkillBase {
  skillType: typeof SKILL_TYPES.ENTRY_POINT | typeof SKILL_TYPES.WORKER;
  workerSteps?: LoadedWorkerStep[];
}

// ローダー用の委譲ステップ型（Worker / Teammate 共通）
export interface LoadedDelegateStep {
  id: string;
  title: string;
  body: string;
}

// LoadedDelegateStep の用途別エイリアス
export type LoadedWorkerStep = LoadedDelegateStep;

// WORKER_WITH_SUB_AGENT の場合は agentConfig を保持
export interface LoadedWorkerWithSubAgentSkill extends LoadedSkillBase {
  skillType: typeof SKILL_TYPES.WORKER_WITH_SUB_AGENT;
  agentConfig: AgentConfig;
  workerSteps: LoadedWorkerStep[];
}

// ローダー用のチームメンバー型
export interface LoadedTeammate {
  name: string;
  role: string;
  steps: LoadedDelegateStep[];
  sortOrder?: number;
  communicationPattern?: CommunicationPattern;
}

// WORKER_WITH_AGENT_TEAM の場合は teammates を保持
export interface LoadedWorkerWithAgentTeamSkill extends LoadedSkillBase {
  skillType: typeof SKILL_TYPES.WORKER_WITH_AGENT_TEAM;
  teammates: LoadedTeammate[];
  teamPrefix: string;
  additionalLeaderSteps?: string[];
  requiresUserApproval?: boolean;
}

// discriminated union: skillType で型が絞り込まれる
export type LoadedSkillUnion =
  | LoadedSkill
  | LoadedWorkerWithSubAgentSkill
  | LoadedWorkerWithAgentTeamSkill;

// ローダーが返すフックスクリプト型（content解決済み）
export interface LoadedHookScript {
  filename: string;
  content: string;
}

// ローダーが返すフック定義型
export interface LoadedHookDefinition {
  description?: string;
  hooks: Record<string, import("./plugin").HookEntry[]>;
  scripts?: LoadedHookScript[];
}

// ローダーが返すプラグイン定義型
export interface LoadedPluginDefinition {
  name: string;
  description?: string;
  skills: LoadedSkillUnion[];
  hooks?: LoadedHookDefinition;
}
