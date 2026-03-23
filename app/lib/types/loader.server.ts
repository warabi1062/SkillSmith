// プラグイン定義ローダーのインターフェース
// .server.ts サフィックス: Node.js ファイルシステム API を使うため（Remix の慣習に準拠）

import type { SupportFileRole, SkillType } from "./skill";
import type { SkillDependency } from "./plugin";

// ローダーが返す型: SupportFile + 読み込んだ content
export interface LoadedSupportFile {
  role: SupportFileRole;
  filename: string;
  content: string;
  sortOrder?: number;
}

// ローダーが返すスキル型: Skill の files が LoadedSupportFile[] に拡張
// TODO: 後続チケットで discriminated union 型に拡張し、
// agentConfig（WorkerWithSubAgent）や agentTeamMembers（WorkerWithAgentTeam）を保持できるようにする
export interface LoadedSkill {
  skillType: SkillType;
  name: string;
  content: string;
  description?: string;
  input?: string;
  output?: string;
  allowedTools?: string[];
  argumentHint?: string;
  files: LoadedSupportFile[];
}

// ローダーが返すプラグイン定義型
export interface LoadedPluginDefinition {
  name: string;
  description?: string;
  skills: LoadedSkill[];
  dependencies: SkillDependency[];
}

// インターフェースのみ定義、実装は後続チケットで差し替え
export async function loadPluginDefinition(
  dirPath: string,
): Promise<LoadedPluginDefinition> {
  // dirPath を使用する実装は後続チケットで追加
  void dirPath;
  throw new Error("Not implemented: loadPluginDefinition は後続チケットで実装");
}
