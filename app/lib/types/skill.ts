// スキル型定義: abstract class とサブクラス

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
  "description" | "input" | "output" | "allowedTools" | "argumentHint" | "files"
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
