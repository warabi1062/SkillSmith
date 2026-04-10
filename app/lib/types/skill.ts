// スキル型定義: abstract class とサブクラス

import {
  SKILL_TYPES,
  TOOL_REF_TYPES,
  COMMUNICATION_PATTERNS,
  SUPPORT_FILE_ROLES,
} from "./constants";

// ツール参照の構造化型（string ではなく型安全にツールを指定する）
export type ToolRef =
  | { type: typeof TOOL_REF_TYPES.TOOL; name: string; pattern?: string } // 組み込みツール: "Read", "Bash(git *)"
  | { type: typeof TOOL_REF_TYPES.MCP; server: string; method: string }; // MCPツール: "mcp__server__method"

// ファクトリ関数
export function tool(name: string): ToolRef {
  return { type: TOOL_REF_TYPES.TOOL, name };
}

export function bash(pattern: string): ToolRef {
  return { type: TOOL_REF_TYPES.TOOL, name: "Bash", pattern };
}

export function mcp(server: string, method: string): ToolRef {
  return { type: TOOL_REF_TYPES.MCP, server, method };
}

// ToolRef → YAML出力用文字列に変換
export function serializeToolRef(ref: ToolRef): string {
  if (ref.type === TOOL_REF_TYPES.MCP) {
    return `mcp__${ref.server}__${ref.method}`;
  }
  if (ref.pattern) {
    return `${ref.name}(${ref.pattern})`;
  }
  return ref.name;
}

// 分岐ステップ（再帰的にネスト可能）
export interface Branch {
  decisionPoint: string; // 分岐判定名（例: "入力判定"）
  description?: string; // 判定条件の詳細説明
  cases: Record<string, Step[]>; // case名 → ステップ列
}

// 委譲ステップ（InlineStep / Teammate 共通の構造化された手順記述）
export interface DelegateStep {
  id: string; // ステップID（例: "1", "2a", "I1"）
  title: string; // ステップ名（例: "ベースブランチ判定"）
  body: string; // ステップの説明本文
}

// インラインステップ（スキル委譲せずオーケストレーター自身が行う処理）
export interface InlineStep {
  inline: string; // 表示名（例: "ブランチ作成"）
  steps: DelegateStep[]; // 構造化された手順ステップ
  input?: string[]; // 入力の説明
  output?: string[]; // 出力の説明
}

// ステップ型（Skill / Branch / InlineStep の union）
export type Step = Skill | Branch | InlineStep;

// Branch かどうかを判定する型ガード（collectSkillsFromSteps 内部で使用）
function isBranch(step: Step): step is Branch {
  return "decisionPoint" in step && "cases" in step;
}

// InlineStep かどうかを判定する型ガード（collectSkillsFromSteps 内部で使用）
function isInlineStep(step: Step): step is InlineStep {
  return "inline" in step && !("decisionPoint" in step);
}

// Step[] から全 Skill を再帰的にフラット収集するヘルパー（重複除去）
export function collectSkillsFromSteps(steps: Step[]): Skill[] {
  const seen = new Set<string>();
  const result: Skill[] = [];
  for (const step of steps) {
    if (isBranch(step)) {
      for (const caseSteps of Object.values(step.cases)) {
        for (const skill of collectSkillsFromSteps(caseSteps)) {
          if (!seen.has(skill.name)) {
            seen.add(skill.name);
            result.push(skill);
          }
        }
      }
    } else if (isInlineStep(step)) {
      // インラインステップはスキル参照ではないのでスキップ
      continue;
    } else {
      if (!seen.has(step.name)) {
        seen.add(step.name);
        result.push(step);
      }
    }
  }
  return result;
}

// セクション（heading + body のシンプル構造）
export interface Section {
  heading: string;
  body: string;
}

// サポートファイルの役割
export type SupportFileRole =
  (typeof SUPPORT_FILE_ROLES)[keyof typeof SUPPORT_FILE_ROLES];

// サポートファイルの参照宣言（定義ファイル上の型）
export interface SupportFile {
  role: SupportFileRole;
  filename: string;
  sortOrder?: number;
}

// Agent設定（WorkerWithSubAgent用）
// description + beforeSections/afterSections から content を自動生成
export interface AgentConfig {
  model?: string;
  tools?: ToolRef[];
  description: string; // agentの説明
  beforeSections?: Section[]; // 実行セクション前の追加セクション
  afterSections?: Section[]; // 実行セクション後の追加セクション
}

// チームメンバーのコミュニケーションパターン（discriminated union）
export type CommunicationPattern =
  | { type: typeof COMMUNICATION_PATTERNS.POLLER; target: string } // このメンバーが target をポーリング
  | { type: typeof COMMUNICATION_PATTERNS.RESPONDER }; // status_check に応答する側

// チームメンバーの構造化定義
export interface Teammate {
  name: string; // メンバー名（例: "implementer"）
  role: string; // 役割の説明（例: "実装計画に従ってコードを実装し、テストを書く"）
  steps: DelegateStep[]; // 手順ステップの配列
  sortOrder?: number;
  communicationPattern?: CommunicationPattern; // コミュニケーションパターン
}

// SkillType の文字列リテラル型
export type SkillType = (typeof SKILL_TYPES)[keyof typeof SKILL_TYPES];

// Skill の共通オプショナルフィールド
type SkillOptionalFields = Pick<
  Skill,
  | "description"
  | "input"
  | "output"
  | "allowedTools"
  | "argumentHint"
  | "userInvocable"
  | "disableModelInvocation"
  | "files"
  | "dependencies"
  | "steps"
  | "beforeSections"
  | "afterSections"
>;

// 基底クラス
export abstract class Skill {
  abstract readonly skillType: SkillType;
  abstract readonly name: string;

  description?: string;
  input?: string[];
  output?: string[];
  allowedTools?: ToolRef[];
  argumentHint?: string;
  userInvocable?: boolean;
  disableModelInvocation?: boolean;
  files?: SupportFile[];
  dependencies?: Skill[]; // このスキルが呼び出すスキルインスタンスのリスト
  steps?: Step[]; // オーケストレーター用: 再帰的ステップ定義（Branch を含む）
  beforeSections?: Section[]; // steps/手順の前に配置する追加セクション
  afterSections?: Section[]; // steps/手順の後に配置する追加セクション

  // サブクラスから共通オプショナルフィールドを設定するヘルパー
  protected assignOptionalFields(init: Partial<SkillOptionalFields>): void {
    if (init.description !== undefined) this.description = init.description;
    if (init.input !== undefined) this.input = init.input;
    if (init.output !== undefined) this.output = init.output;
    if (init.allowedTools !== undefined) this.allowedTools = init.allowedTools;
    if (init.argumentHint !== undefined) this.argumentHint = init.argumentHint;
    if (init.userInvocable !== undefined)
      this.userInvocable = init.userInvocable;
    if (init.disableModelInvocation !== undefined)
      this.disableModelInvocation = init.disableModelInvocation;
    if (init.files !== undefined) this.files = init.files;
    if (init.dependencies !== undefined) this.dependencies = init.dependencies;
    if (init.steps !== undefined) this.steps = init.steps;
    if (init.beforeSections !== undefined)
      this.beforeSections = init.beforeSections;
    if (init.afterSections !== undefined)
      this.afterSections = init.afterSections;
  }
}

// EntryPoint スキル: ユーザーが /skill-name で直接呼び出すスキル
// content は plugin-generator が steps + sections + メタデータから自動生成する
export class EntryPointSkill extends Skill {
  readonly skillType = SKILL_TYPES.ENTRY_POINT;
  readonly name: string;

  constructor(
    init: { name: string; steps: Step[] } & Partial<
      Omit<SkillOptionalFields, "steps">
    >,
  ) {
    super();
    this.name = init.name;
    // dependencies は steps から自動導出（明示指定があればそちらを優先）
    if (!init.dependencies) {
      init.dependencies = collectSkillsFromSteps(init.steps);
    }
    this.assignOptionalFields(init);
  }
}

// Worker スキル: オーケストレーターの1ステップを担当するスキル
// workerSteps + beforeSections/afterSections から content を自動生成
export class WorkerSkill extends Skill {
  readonly skillType = SKILL_TYPES.WORKER;
  readonly name: string;
  readonly workerSteps: DelegateStep[];

  constructor(
    init: {
      name: string;
      workerSteps: DelegateStep[];
    } & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.workerSteps = init.workerSteps;
    this.assignOptionalFields(init);
  }
}

// WorkerWithSubAgent スキル: Sub Agent を伴う Worker スキル
// workerSteps + beforeSections/afterSections から content を自動生成
export class WorkerWithSubAgent extends Skill {
  readonly skillType = SKILL_TYPES.WORKER_WITH_SUB_AGENT;
  readonly name: string;
  readonly agentConfig: AgentConfig;
  readonly workerSteps: DelegateStep[];

  constructor(
    init: {
      name: string;
      workerSteps: DelegateStep[];
    } & {
      agentConfig: AgentConfig;
    } & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.agentConfig = init.agentConfig;
    this.workerSteps = init.workerSteps;
    this.assignOptionalFields(init);
  }
}

// WorkerWithAgentTeam スキル: Agent Team を管理する Worker スキル
// teammates から content を自動生成するため、content は不要
export class WorkerWithAgentTeam extends Skill {
  readonly skillType = SKILL_TYPES.WORKER_WITH_AGENT_TEAM;
  readonly name: string;
  readonly teammates: Teammate[];
  readonly teamPrefix: string; // チーム名のプレフィックス（例: "impl", "plan", "triage"）
  readonly additionalLeaderSteps?: string[]; // リーダーの手順（箇条書き）
  readonly requiresUserApproval?: boolean; // レビューPASS後にユーザー承認を得るか

  constructor(
    init: {
      name: string;
      teammates: Teammate[];
      teamPrefix: string;
      additionalLeaderSteps?: string[];
      requiresUserApproval?: boolean;
    } & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.teammates = init.teammates;
    this.teamPrefix = init.teamPrefix;
    this.additionalLeaderSteps = init.additionalLeaderSteps;
    this.requiresUserApproval = init.requiresUserApproval;
    this.assignOptionalFields(init);
  }
}
