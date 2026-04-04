// スキル型定義: abstract class とサブクラス

import {
  SKILL_TYPES,
  TOOL_REF_TYPES,
  COMMUNICATION_PATTERNS,
  SECTION_POSITIONS,
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

// 文字列 → ToolRef にパース
export function parseToolRef(str: string): ToolRef {
  // MCPツール: mcp__server__method
  if (str.startsWith("mcp__")) {
    const rest = str.slice(5); // "mcp__" を除去
    const idx = rest.indexOf("__");
    if (idx >= 0) {
      return {
        type: TOOL_REF_TYPES.MCP,
        server: rest.slice(0, idx),
        method: rest.slice(idx + 2),
      };
    }
  }
  // パターン付きツール: Name(pattern)
  const match = str.match(/^([A-Za-z]+)\((.+)\)$/);
  if (match) {
    return { type: TOOL_REF_TYPES.TOOL, name: match[1], pattern: match[2] };
  }
  // 単純ツール
  return { type: TOOL_REF_TYPES.TOOL, name: str };
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
  body?: string; // ステップの説明本文（bodyFile と排他）
  bodyFile?: string; // 説明本文を外部mdファイルから読み込む（スキルディレクトリからの相対パス）
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

// Branch かどうかを判定する型ガード
export function isBranch(step: Step): step is Branch {
  return "decisionPoint" in step && "cases" in step;
}

// InlineStep かどうかを判定する型ガード
export function isInlineStep(step: Step): step is InlineStep {
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

// セクションの配置位置（before-steps/after-stepsに加え、特定ステップの前後に配置可能）
export type SectionPosition =
  | typeof SECTION_POSITIONS.BEFORE_STEPS
  | typeof SECTION_POSITIONS.AFTER_STEPS
  | `${typeof SECTION_POSITIONS.BEFORE_STEP_PREFIX}${number}`
  | `${typeof SECTION_POSITIONS.AFTER_STEP_PREFIX}${number}`;

// オーケストレーターのセクション（steps前後またはstep間に配置する追加コンテンツ）
export interface OrchestratorSection {
  heading: string;
  body?: string; // セクション本文（bodyFile と排他）
  bodyFile?: string; // 本文を外部mdファイルから読み込む（スキルディレクトリからの相対パス）
  position: SectionPosition;
}

// サポートファイルの役割
export type SupportFileRole = (typeof SUPPORT_FILE_ROLES)[keyof typeof SUPPORT_FILE_ROLES];

// サポートファイルの参照宣言（定義ファイル上の型）
export interface SupportFile {
  role: SupportFileRole;
  filename: string;
  sortOrder?: number;
}

// Agent設定（WorkerWithSubAgent用）
// content 直書きまたは description + sections から自動生成
export interface AgentConfig {
  model?: string;
  tools?: ToolRef[];
  content: string; // agent.md 本文（後方互換）
  description?: string; // 構造化時: agentの説明
  sections?: OrchestratorSection[]; // 構造化時: 追加セクション
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
  | "displayName"
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
  | "sections"
>;

// 基底クラス
export abstract class Skill {
  abstract readonly skillType: SkillType;
  abstract readonly name: string;
  abstract readonly content: string;

  displayName?: string; // SKILL.md の見出しに使う表示名（例: "Create PR"）
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
  sections?: OrchestratorSection[]; // オーケストレーター用: steps前後の追加セクション

  // サブクラスから共通オプショナルフィールドを設定するヘルパー
  protected assignOptionalFields(init: Partial<SkillOptionalFields>): void {
    if (init.displayName !== undefined) this.displayName = init.displayName;
    if (init.description !== undefined) this.description = init.description;
    if (init.input !== undefined) this.input = init.input;
    if (init.output !== undefined) this.output = init.output;
    if (init.allowedTools !== undefined) this.allowedTools = init.allowedTools;
    if (init.argumentHint !== undefined) this.argumentHint = init.argumentHint;
    if (init.userInvocable !== undefined) this.userInvocable = init.userInvocable;
    if (init.disableModelInvocation !== undefined) this.disableModelInvocation = init.disableModelInvocation;
    if (init.files !== undefined) this.files = init.files;
    if (init.dependencies !== undefined) this.dependencies = init.dependencies;
    if (init.steps !== undefined) this.steps = init.steps;
    if (init.sections !== undefined) this.sections = init.sections;
  }
}

// EntryPoint スキル: ユーザーが /skill-name で直接呼び出すスキル
// content は plugin-generator が steps + sections + メタデータから自動生成する
export class EntryPointSkill extends Skill {
  readonly skillType = SKILL_TYPES.ENTRY_POINT;
  readonly name: string;
  readonly content: string = "";

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
export class WorkerSkill extends Skill {
  readonly skillType = SKILL_TYPES.WORKER;
  readonly name: string;
  readonly content: string;

  constructor(
    init: { name: string; content: string } & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.content = init.content;
    this.assignOptionalFields(init);
  }
}

// WorkerWithSubAgent スキル: Sub Agent を伴う Worker スキル
// content 直書きまたは workerSteps + workerSections から自動生成
export class WorkerWithSubAgent extends Skill {
  readonly skillType = SKILL_TYPES.WORKER_WITH_SUB_AGENT;
  readonly name: string;
  readonly content: string;
  readonly agentConfig: AgentConfig;
  readonly workerSteps?: DelegateStep[]; // 構造化時: Workerの手順ステップ
  readonly workerSections?: OrchestratorSection[]; // 構造化時: steps前後の追加セクション

  constructor(
    init: (
      | {
          name: string;
          content: string;
          workerSteps?: never;
          workerSections?: never;
        }
      | {
          name: string;
          workerSteps: DelegateStep[];
          workerSections?: OrchestratorSection[];
          content?: string;
        }
    ) & {
      agentConfig: AgentConfig;
    } & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.content = init.content ?? "";
    this.agentConfig = init.agentConfig;
    if ("workerSteps" in init && init.workerSteps) {
      this.workerSteps = init.workerSteps;
      this.workerSections = init.workerSections;
    }
    this.assignOptionalFields(init);
  }
}

// WorkerWithAgentTeam スキル: Agent Team を管理する Worker スキル
// teammates から content を自動生成するため、content は不要
export class WorkerWithAgentTeam extends Skill {
  readonly skillType = SKILL_TYPES.WORKER_WITH_AGENT_TEAM;
  readonly name: string;
  readonly content: string;
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
      content?: string;
    } & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.content = init.content ?? "";
    this.teammates = init.teammates;
    this.teamPrefix = init.teamPrefix;
    this.additionalLeaderSteps = init.additionalLeaderSteps;
    this.requiresUserApproval = init.requiresUserApproval;
    this.assignOptionalFields(init);
  }
}
