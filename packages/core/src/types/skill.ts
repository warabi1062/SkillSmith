// スキル型定義: abstract class とサブクラス

import {
  AGENT_MEMORY_SCOPES,
  AGENT_PERMISSION_MODES,
  EFFORT_LEVELS,
  SKILL_TYPES,
  TOOL_REF_TYPES,
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

// サポートファイルの参照宣言（定義ファイル上の型）
export interface SupportFile {
  filename: string;
}

// モデル指定に使う値
// Claude Code の仕様（https://code.claude.com/docs/en/skills#frontmatter-reference）に準拠し、
// エイリアス（sonnet / opus / haiku）・inherit のほか、フル ID などの任意の文字列も受け付ける
export type ModelSpec = "sonnet" | "opus" | "haiku" | "inherit" | (string & {});

// effort に指定できる値
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

// agent.md の permissionMode に指定できる値
export type AgentPermissionMode = (typeof AGENT_PERMISSION_MODES)[number];

// agent.md の memory に指定できる値
export type AgentMemoryScope = (typeof AGENT_MEMORY_SCOPES)[number];

// Agent設定（WorkerWithSubAgent用）
// description + beforeSections/afterSections から content を自動生成
// frontmatter フィールドは Claude Code の sub-agents 仕様（https://code.claude.com/docs/en/sub-agents）に準拠
export interface AgentConfig {
  model?: ModelSpec;
  effort?: EffortLevel;
  tools?: ToolRef[];
  disallowedTools?: ToolRef[]; // tools やデフォルトから除外するツール
  permissionMode?: AgentPermissionMode;
  maxTurns?: number; // エージェントの最大ターン数
  memory?: AgentMemoryScope; // 永続メモリのスコープ
  isolation?: "worktree"; // 一時 git worktree で隔離実行
  description: string; // agentの説明
  beforeSections?: Section[]; // 実行セクション前の追加セクション
  afterSections?: Section[]; // 実行セクション後の追加セクション
}

// チームメンバーの構造化定義
export interface Teammate {
  name: string; // メンバー名（例: "implementer"）
  role: string; // 役割の説明（例: "実装計画に従ってコードを実装し、テストを書く"）
  model?: ModelSpec; // Agent ツールの model パラメータで指定するモデル
  steps: DelegateStep[]; // 手順ステップの配列
  sortOrder?: number;
}

// SkillType の文字列リテラル型
export type SkillType = (typeof SKILL_TYPES)[keyof typeof SKILL_TYPES];

// SKILL.md frontmatter で指定可能な model 値（/model で指定できる任意の値 + inherit）
export type SkillModel = ModelSpec;

// Skill の共通オプショナルフィールド
type SkillOptionalFields = Pick<
  Skill,
  | "description"
  | "input"
  | "output"
  | "allowedTools"
  | "disallowedTools"
  | "argumentHint"
  | "arguments"
  | "userInvocable"
  | "disableModelInvocation"
  | "model"
  | "effort"
  | "paths"
  | "whenToUse"
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
  disallowedTools?: ToolRef[]; // スキル実行中にツールプールから除外するツール
  argumentHint?: string;
  arguments?: string[]; // 名前付き位置引数。本文で $name として参照できる
  userInvocable?: boolean;
  disableModelInvocation?: boolean;
  model?: SkillModel; // SKILL.md frontmatter の model フィールド
  effort?: EffortLevel; // SKILL.md frontmatter の effort フィールド
  paths?: string[]; // 自動有効化を限定する glob パターン
  whenToUse?: string; // description に追記される呼び出し文脈（合計 1536 文字まで）
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
    if (init.disallowedTools !== undefined)
      this.disallowedTools = init.disallowedTools;
    if (init.argumentHint !== undefined) this.argumentHint = init.argumentHint;
    if (init.arguments !== undefined) this.arguments = init.arguments;
    if (init.userInvocable !== undefined)
      this.userInvocable = init.userInvocable;
    if (init.disableModelInvocation !== undefined)
      this.disableModelInvocation = init.disableModelInvocation;
    if (init.model !== undefined) this.model = init.model;
    if (init.effort !== undefined) this.effort = init.effort;
    if (init.paths !== undefined) this.paths = init.paths;
    if (init.whenToUse !== undefined) this.whenToUse = init.whenToUse;
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
