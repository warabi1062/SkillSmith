// スキル型定義: abstract class とサブクラス

// ツール参照の構造化型（string ではなく型安全にツールを指定する）
export type ToolRef =
  | { type: "tool"; name: string; pattern?: string }  // 組み込みツール: "Read", "Bash(git *)"
  | { type: "mcp"; server: string; method: string };  // MCPツール: "mcp__server__method"

// ファクトリ関数
export function tool(name: string): ToolRef {
  return { type: "tool", name };
}

export function bash(pattern: string): ToolRef {
  return { type: "tool", name: "Bash", pattern };
}

export function mcp(server: string, method: string): ToolRef {
  return { type: "mcp", server, method };
}

// ToolRef → YAML出力用文字列に変換
export function serializeToolRef(ref: ToolRef): string {
  if (ref.type === "mcp") {
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
      return { type: "mcp", server: rest.slice(0, idx), method: rest.slice(idx + 2) };
    }
  }
  // パターン付きツール: Name(pattern)
  const match = str.match(/^([A-Za-z]+)\((.+)\)$/);
  if (match) {
    return { type: "tool", name: match[1], pattern: match[2] };
  }
  // 単純ツール
  return { type: "tool", name: str };
}

// 分岐ステップ（再帰的にネスト可能）
export interface Branch {
  decisionPoint: string;           // 分岐判定名（例: "入力判定"）
  description?: string;            // 判定条件の詳細説明
  cases: Record<string, Step[]>;   // case名 → ステップ列
}

// インラインステップのサブステップ（構造化された手順記述）
export interface InlineSubStep {
  id: string;                      // ステップID（例: "1", "2a"）
  title: string;                   // ステップ名（例: "ベースブランチ判定"）
  body: string;                    // ステップの説明本文
}

// インラインステップ（スキル委譲せずオーケストレーター自身が行う処理）
export interface InlineStep {
  inline: string;                  // 表示名（例: "ブランチ作成"）
  steps: InlineSubStep[];          // 構造化された手順ステップ
  input?: string;                  // 入力の説明
  output?: string;                 // 出力の説明
  tools?: ToolRef[];               // 使用するツール
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
  | "before-steps"
  | "after-steps"
  | `before-step:${number}`
  | `after-step:${number}`;

// オーケストレーターのセクション（steps前後またはstep間に配置する追加コンテンツ）
export interface OrchestratorSection {
  heading: string;
  body: string;
  position: SectionPosition;
}

// サポートファイルの役割
export type SupportFileRole = "TEMPLATE" | "REFERENCE" | "EXAMPLE";

// サポートファイルの参照宣言（定義ファイル上の型）
export interface SupportFile {
  role: SupportFileRole;
  filename: string;
  sortOrder?: number;
}

// Agent設定のセクション（OrchestratorSectionと同じ構造）
export interface AgentConfigSection {
  heading: string;
  body: string;
  position: SectionPosition;
}

// Agent設定（WorkerWithSubAgent用）
// content 直書きまたは description + sections から自動生成
export interface AgentConfig {
  model?: string;
  tools?: ToolRef[];
  content: string; // agent.md 本文（後方互換）
  description?: string;                // 構造化時: agentの説明
  sections?: AgentConfigSection[];     // 構造化時: 追加セクション
}

// Agent Teamメンバー（WorkerWithAgentTeam用）
export interface AgentTeamMember {
  skillName: string; // メンバースキル名の参照
  sortOrder?: number;
}

// チームメンバーの手順ステップ
export interface TeammateStep {
  id: string;        // ステップID（例: "I1", "V1"）
  title: string;     // ステップ名（例: "実装計画の読み込み"）
  body: string;      // ステップの説明本文
}

// チームメンバーのコミュニケーションパターン（discriminated union）
export type CommunicationPattern =
  | { type: "poller"; target: string }   // このメンバーが target をポーリング
  | { type: "responder" };               // status_check に応答する側

// チームメンバーの構造化定義
export interface Teammate {
  name: string;                              // メンバー名（例: "implementer"）
  role: string;                              // 役割の説明（例: "実装計画に従ってコードを実装し、テストを書く"）
  steps: TeammateStep[];                     // 手順ステップの配列
  sortOrder?: number;
  communicationPattern?: CommunicationPattern;  // コミュニケーションパターン
}

// Teammate → AgentTeamMember への変換
export function toAgentTeamMember(teammate: Teammate): AgentTeamMember {
  return {
    skillName: teammate.name,
    sortOrder: teammate.sortOrder,
  };
}

// SkillType の文字列リテラル型
export type SkillType =
  | "ENTRY_POINT"
  | "WORKER"
  | "WORKER_WITH_SUB_AGENT"
  | "WORKER_WITH_AGENT_TEAM";

// Skill の共通オプショナルフィールド
type SkillOptionalFields = Pick<
  Skill,
  "description" | "input" | "output" | "allowedTools" | "argumentHint" | "files" | "dependencies" | "steps" | "sections"
>;

// 基底クラス
export abstract class Skill {
  abstract readonly skillType: SkillType;
  abstract readonly name: string;
  abstract readonly content: string;

  description?: string;
  input?: string;
  output?: string;
  allowedTools?: ToolRef[];
  argumentHint?: string;
  files?: SupportFile[];
  dependencies?: Skill[]; // このスキルが呼び出すスキルインスタンスのリスト
  steps?: Step[];         // オーケストレーター用: 再帰的ステップ定義（Branch を含む）
  sections?: OrchestratorSection[]; // オーケストレーター用: steps前後の追加セクション

  // サブクラスから共通オプショナルフィールドを設定するヘルパー
  protected assignOptionalFields(
    init: Partial<SkillOptionalFields>,
  ): void {
    if (init.description !== undefined) this.description = init.description;
    if (init.input !== undefined) this.input = init.input;
    if (init.output !== undefined) this.output = init.output;
    if (init.allowedTools !== undefined) this.allowedTools = init.allowedTools;
    if (init.argumentHint !== undefined) this.argumentHint = init.argumentHint;
    if (init.files !== undefined) this.files = init.files;
    if (init.dependencies !== undefined) this.dependencies = init.dependencies;
    if (init.steps !== undefined) this.steps = init.steps;
    if (init.sections !== undefined) this.sections = init.sections;
  }
}

// EntryPoint スキル: ユーザーが /skill-name で直接呼び出すスキル
// content は plugin-generator が steps + sections + メタデータから自動生成する
export class EntryPointSkill extends Skill {
  readonly skillType = "ENTRY_POINT" as const;
  readonly name: string;
  readonly content: string = "";

  constructor(
    init: { name: string; steps: Step[] } & Partial<Omit<SkillOptionalFields, "steps">>,
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
  readonly skillType = "WORKER" as const;
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
  readonly skillType = "WORKER_WITH_SUB_AGENT" as const;
  readonly name: string;
  readonly content: string;
  readonly agentConfig: AgentConfig;
  readonly workerSteps?: TeammateStep[];                // 構造化時: Workerの手順ステップ
  readonly workerSections?: OrchestratorSection[];      // 構造化時: steps前後の追加セクション

  constructor(
    init: (
      | { name: string; content: string; workerSteps?: never; workerSections?: never }
      | { name: string; workerSteps: TeammateStep[]; workerSections?: OrchestratorSection[]; content?: string }
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
// teammates がある場合は content を自動生成するため、content は不要
export class WorkerWithAgentTeam extends Skill {
  readonly skillType = "WORKER_WITH_AGENT_TEAM" as const;
  readonly name: string;
  readonly content: string;
  readonly teammates?: Teammate[];
  readonly teamPrefix?: string;               // チーム名のプレフィックス（例: "impl", "plan", "triage"）
  readonly requiresUserApproval?: boolean;     // レビューPASS後にユーザー承認を得るか

  // 後方互換: teammates から AgentTeamMember[] を導出、なければ直接指定
  get agentTeamMembers(): AgentTeamMember[] {
    if (this.teammates) {
      return this.teammates.map(toAgentTeamMember);
    }
    return this._agentTeamMembers ?? [];
  }
  private readonly _agentTeamMembers?: AgentTeamMember[];

  constructor(
    init: (
      | { name: string; teammates: Teammate[]; teamPrefix: string; requiresUserApproval?: boolean; content?: string; agentTeamMembers?: never }
      | { name: string; content: string; agentTeamMembers: AgentTeamMember[]; teammates?: never; teamPrefix?: never; requiresUserApproval?: never }
    ) & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.content = init.content ?? "";
    if ("teammates" in init && init.teammates) {
      this.teammates = init.teammates;
      this.teamPrefix = init.teamPrefix;
      this.requiresUserApproval = init.requiresUserApproval;
    } else if ("agentTeamMembers" in init && init.agentTeamMembers) {
      this._agentTeamMembers = init.agentTeamMembers;
    }
    this.assignOptionalFields(init);
  }
}
