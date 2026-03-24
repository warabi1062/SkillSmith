// スキル型定義: abstract class とサブクラス

// 分岐ステップ（再帰的にネスト可能）
export interface Branch {
  decisionPoint: string;           // 分岐判定名（例: "入力判定"）
  cases: Record<string, Step[]>;   // case名 → ステップ列
}

// ステップ型（Skill または Branch の union）
export type Step = Skill | Branch;

// Branch かどうかを判定する型ガード
export function isBranch(step: Step): step is Branch {
  return "decisionPoint" in step && "cases" in step;
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
    } else {
      if (!seen.has(step.name)) {
        seen.add(step.name);
        result.push(step);
      }
    }
  }
  return result;
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

// SkillType の文字列リテラル型
export type SkillType =
  | "ENTRY_POINT"
  | "WORKER"
  | "WORKER_WITH_SUB_AGENT"
  | "WORKER_WITH_AGENT_TEAM";

// Skill の共通オプショナルフィールド
type SkillOptionalFields = Pick<
  Skill,
  "description" | "input" | "output" | "allowedTools" | "argumentHint" | "files" | "dependencies" | "steps"
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
  }
}

// EntryPoint スキル: ユーザーが /skill-name で直接呼び出すスキル
export class EntryPointSkill extends Skill {
  readonly skillType = "ENTRY_POINT" as const;
  readonly name: string;
  readonly content: string;

  constructor(
    init: { name: string; content: string } & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.content = init.content;
    // steps が指定され dependencies が未指定の場合、steps から自動導出
    if (init.steps && !init.dependencies) {
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
export class WorkerWithAgentTeam extends Skill {
  readonly skillType = "WORKER_WITH_AGENT_TEAM" as const;
  readonly name: string;
  readonly content: string;
  readonly agentTeamMembers: AgentTeamMember[];

  constructor(
    init: {
      name: string;
      content: string;
      agentTeamMembers: AgentTeamMember[];
    } & Partial<SkillOptionalFields>,
  ) {
    super();
    this.name = init.name;
    this.content = init.content;
    this.agentTeamMembers = init.agentTeamMembers;
    this.assignOptionalFields(init);
  }
}
