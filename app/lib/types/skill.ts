// スキル型定義: abstract class とサブクラス

// 分岐ステップ（再帰的にネスト可能）
export interface Branch {
  decisionPoint: string;           // 分岐判定名（例: "入力判定"）
  description?: string;            // 判定条件の詳細説明
  cases: Record<string, Step[]>;   // case名 → ステップ列
}

// インラインステップ（スキル委譲せずオーケストレーター自身が行う処理）
export interface InlineStep {
  inline: string;                  // 表示名（例: "ブランチ作成"）
  description?: string;            // 手順の詳細説明
  input?: string;                  // 入力の説明
  output?: string;                 // 出力の説明
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

// オーケストレーターのセクション（steps前後に配置する追加コンテンツ）
export interface OrchestratorSection {
  heading: string;
  body: string;
  position: "before-steps" | "after-steps";
}

// サポートファイルの役割
export type SupportFileRole = "TEMPLATE" | "REFERENCE" | "EXAMPLE";

// サポートファイルの参照宣言（定義ファイル上の型）
export interface SupportFile {
  role: SupportFileRole;
  filename: string;
  sortOrder?: number;
}

// Agent設定（WorkerWithSubAgent用）
export interface AgentConfig {
  model?: string;
  tools?: string[];
  content: string; // agent.md 本文
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

// チームメンバーの構造化定義
export interface Teammate {
  name: string;                    // メンバー名（例: "implementer"）
  role: string;                    // 役割の説明（例: "実装計画に従ってコードを実装し、テストを書く"）
  steps: TeammateStep[];           // 手順ステップの配列
  sortOrder?: number;
  pollingTarget?: string;          // ポーリング対象のteammate名（reviewer用）
  statusCheckResponder?: boolean;  // status_check応答側か（worker用）
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
  allowedTools?: string[];
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
export class WorkerWithSubAgent extends Skill {
  readonly skillType = "WORKER_WITH_SUB_AGENT" as const;
  readonly name: string;
  readonly content: string;
  readonly agentConfig: AgentConfig;

  constructor(
    init: {
      name: string;
      content: string;
      agentConfig: AgentConfig;
    } & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.content = init.content;
    this.agentConfig = init.agentConfig;
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
