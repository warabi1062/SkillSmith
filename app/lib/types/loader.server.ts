// プラグイン定義ローダー
// .server.ts サフィックス: Node.js ファイルシステム API を使うため（Remix の慣習に準拠）

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SupportFileRole, SkillType, AgentConfig, AgentTeamMember } from "./skill";
import type { SkillDependency } from "./plugin";

// ローダーが返す型: SupportFile + 読み込んだ content
export interface LoadedSupportFile {
  role: SupportFileRole;
  filename: string;
  content: string;
  sortOrder?: number;
}

// ローダーが返すスキルの共通フィールド
interface LoadedSkillBase {
  name: string;
  content: string;
  description?: string;
  input?: string;
  output?: string;
  allowedTools?: string[];
  argumentHint?: string;
  files: LoadedSupportFile[];
}

// ENTRY_POINT / WORKER の場合
export interface LoadedSkill extends LoadedSkillBase {
  skillType: "ENTRY_POINT" | "WORKER";
}

// WORKER_WITH_SUB_AGENT の場合は agentConfig を保持
export interface LoadedWorkerWithSubAgentSkill extends LoadedSkillBase {
  skillType: "WORKER_WITH_SUB_AGENT";
  agentConfig: AgentConfig;
}

// WORKER_WITH_AGENT_TEAM の場合は agentTeamMembers を保持
export interface LoadedWorkerWithAgentTeamSkill extends LoadedSkillBase {
  skillType: "WORKER_WITH_AGENT_TEAM";
  agentTeamMembers: AgentTeamMember[];
}

// discriminated union: skillType で型が絞り込まれる
export type LoadedSkillUnion =
  | LoadedSkill
  | LoadedWorkerWithSubAgentSkill
  | LoadedWorkerWithAgentTeamSkill;

// ローダーが返すプラグイン定義型
export interface LoadedPluginDefinition {
  name: string;
  description?: string;
  skills: LoadedSkillUnion[];
  dependencies: SkillDependency[];
}

// プラグイン定義をディレクトリから読み込む
export async function loadPluginDefinition(
  dirPath: string,
): Promise<LoadedPluginDefinition> {
  const pluginTsPath = path.join(dirPath, "plugin.ts");

  // plugin.ts の存在チェック
  try {
    await fs.access(pluginTsPath);
  } catch {
    throw new Error(`plugin.ts が見つかりません: ${pluginTsPath}`);
  }

  // plugin.ts を動的importで読み込む（tsx がトランスパイルを処理する）
  const pluginModule = await import(/* @vite-ignore */ pluginTsPath);
  const pluginDef = pluginModule.default;

  if (!pluginDef || !pluginDef.name || !Array.isArray(pluginDef.skills)) {
    throw new Error(`plugin.ts が有効な PluginDefinition を export していません: ${pluginTsPath}`);
  }

  // 各スキルを LoadedSkillUnion に変換
  const skills: LoadedSkillUnion[] = await Promise.all(
    pluginDef.skills.map(async (skill: any) => {
      // サポートファイルの読み込み
      const loadedFiles: LoadedSupportFile[] = [];
      if (skill.files && Array.isArray(skill.files)) {
        for (const file of skill.files) {
          const filePath = path.join(dirPath, "skills", skill.name, file.filename);
          try {
            const content = await fs.readFile(filePath, "utf-8");
            loadedFiles.push({
              role: file.role,
              filename: file.filename,
              content,
              sortOrder: file.sortOrder,
            });
          } catch {
            throw new Error(
              `サポートファイルが見つかりません: ${filePath}`,
            );
          }
        }
      }

      // 基本フィールド
      const base: LoadedSkill = {
        skillType: skill.skillType,
        name: skill.name,
        content: skill.content,
        description: skill.description,
        input: skill.input,
        output: skill.output,
        allowedTools: skill.allowedTools,
        argumentHint: skill.argumentHint,
        files: loadedFiles,
      };

      // skillType に応じた拡張
      if (skill.skillType === "WORKER_WITH_SUB_AGENT" && skill.agentConfig) {
        return {
          ...base,
          skillType: "WORKER_WITH_SUB_AGENT" as const,
          agentConfig: skill.agentConfig,
        } satisfies LoadedWorkerWithSubAgentSkill;
      }

      if (skill.skillType === "WORKER_WITH_AGENT_TEAM" && skill.agentTeamMembers) {
        return {
          ...base,
          skillType: "WORKER_WITH_AGENT_TEAM" as const,
          agentTeamMembers: skill.agentTeamMembers,
        } satisfies LoadedWorkerWithAgentTeamSkill;
      }

      return base;
    }),
  );

  return {
    name: pluginDef.name,
    description: pluginDef.description,
    skills,
    dependencies: pluginDef.dependencies ?? [],
  };
}

// プラグインのメタデータのみを軽量に取得する（一覧表示用）
export interface PluginMeta {
  dirName: string;
  name: string;
  description: string | null;
  skillCount: number;
}

export async function loadPluginMeta(dirPath: string, dirName: string): Promise<PluginMeta | null> {
  const pluginTsPath = path.join(dirPath, "plugin.ts");
  try {
    await fs.access(pluginTsPath);
    const mod = await import(/* @vite-ignore */ pluginTsPath);
    const def = mod.default;
    if (def && def.name) {
      return {
        dirName,
        name: def.name,
        description: def.description ?? null,
        skillCount: Array.isArray(def.skills) ? def.skills.length : 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// 全プラグインのメタデータを取得する（一覧表示用）
export async function loadAllPluginMeta(): Promise<PluginMeta[]> {
  const pluginsDir = path.join(process.cwd(), "plugins");
  let dirEntries: string[] = [];
  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
    dirEntries = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const results = await Promise.all(
    dirEntries.map((dirName) => loadPluginMeta(path.join(pluginsDir, dirName), dirName)),
  );
  return results.filter((r): r is PluginMeta => r !== null);
}
