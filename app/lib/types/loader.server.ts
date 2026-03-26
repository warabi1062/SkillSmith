// プラグイン定義ローダー
// .server.ts サフィックス: Node.js ファイルシステム API を使うため（Remix の慣習に準拠）

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createJiti } from "jiti";
import type { SupportFileRole, SkillType, AgentConfig, AgentConfigSection, AgentTeamMember, SupportFile, TeammateStep, OrchestratorSection, CommunicationPattern, SectionPosition } from "./skill";

// import 用の分岐ステップ型
interface ImportedBranch {
  decisionPoint: string;
  description?: string;
  cases: Record<string, ImportedStep[]>;
}

// import 用のインラインステップ型
interface ImportedInlineStep {
  inline: string;
  description?: string;
  input?: string;
  output?: string;
}

type ImportedStep = { name: string } | ImportedBranch | ImportedInlineStep;

// ImportedBranch かどうかを判定する型ガード
function isImportedBranch(step: ImportedStep): step is ImportedBranch {
  return "decisionPoint" in step && "cases" in step;
}

// ImportedInlineStep かどうかを判定する型ガード
function isImportedInlineStep(step: ImportedStep): step is ImportedInlineStep {
  return "inline" in step && !("decisionPoint" in step);
}

// 動的importで読み込まれるスキルの型（サブクラス固有フィールドを含む）
interface ImportedSkill {
  skillType: SkillType;
  name: string;
  content?: string;
  description?: string;
  input?: string;
  output?: string;
  allowedTools?: string[];
  argumentHint?: string;
  files?: SupportFile[];
  dependencies?: { name: string }[];
  steps?: ImportedStep[];
  sections?: { heading: string; body: string; position: SectionPosition }[];
  agentConfig?: AgentConfig;
  workerSteps?: TeammateStep[];
  workerSections?: OrchestratorSection[];
  agentTeamMembers?: AgentTeamMember[];
  teammates?: ImportedTeammate[];
  teamPrefix?: string;
  requiresUserApproval?: boolean;
}

// import 用のチームメンバー型
interface ImportedTeammate {
  name: string;
  role: string;
  steps: TeammateStep[];
  sortOrder?: number;
  communicationPattern?: CommunicationPattern;
}

// 動的importで読み込まれるプラグイン定義の型
interface ImportedPluginDefinition {
  name: string;
  description?: string;
  skills: ImportedSkill[];
}

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
  description?: string;
  input?: string;
  output?: string;
}

// ローダー用のオーケストレーターセクション型
export interface LoadedOrchestratorSection {
  heading: string;
  body: string;
  position: SectionPosition;
}

export type LoadedStep = string | LoadedBranch | LoadedInlineStep;

// LoadedBranch かどうかを判定する型ガード
export function isLoadedBranch(step: LoadedStep): step is LoadedBranch {
  return typeof step === "object" && "decisionPoint" in step && "cases" in step;
}

// LoadedInlineStep かどうかを判定する型ガード
export function isLoadedInlineStep(step: LoadedStep): step is LoadedInlineStep {
  return typeof step === "object" && "inline" in step && !("decisionPoint" in step);
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
  dependencies?: string[];
  steps?: LoadedStep[];
  sections?: LoadedOrchestratorSection[];
}

// ENTRY_POINT / WORKER の場合
export interface LoadedSkill extends LoadedSkillBase {
  skillType: "ENTRY_POINT" | "WORKER";
}

// ローダー用のAgentConfigセクション型
export interface LoadedAgentConfigSection {
  heading: string;
  body: string;
  position: SectionPosition;
}

// ローダー用のWorkerステップ型（TeammateStepと同じ構造）
export interface LoadedWorkerStep {
  id: string;
  title: string;
  body: string;
}

// WORKER_WITH_SUB_AGENT の場合は agentConfig を保持
export interface LoadedWorkerWithSubAgentSkill extends LoadedSkillBase {
  skillType: "WORKER_WITH_SUB_AGENT";
  agentConfig: AgentConfig;
  workerSteps?: LoadedWorkerStep[];
  workerSections?: LoadedOrchestratorSection[];
}

// ローダー用のチームメンバーステップ型
export interface LoadedTeammateStep {
  id: string;
  title: string;
  body: string;
}

// ローダー用のチームメンバー型
export interface LoadedTeammate {
  name: string;
  role: string;
  steps: LoadedTeammateStep[];
  sortOrder?: number;
  communicationPattern?: CommunicationPattern;
}

// WORKER_WITH_AGENT_TEAM の場合は agentTeamMembers を保持
export interface LoadedWorkerWithAgentTeamSkill extends LoadedSkillBase {
  skillType: "WORKER_WITH_AGENT_TEAM";
  agentTeamMembers: AgentTeamMember[];
  teammates?: LoadedTeammate[];
  teamPrefix?: string;
  requiresUserApproval?: boolean;
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

  // plugin.ts を動的importで読み込む（jiti で TypeScript をトランスパイル）
  const jiti = createJiti(import.meta.url);
  const pluginModule = await jiti.import(pluginTsPath) as Record<string, unknown>;
  const pluginDef = pluginModule.default as ImportedPluginDefinition | undefined;

  if (!pluginDef || !pluginDef.name || !Array.isArray(pluginDef.skills)) {
    throw new Error(`plugin.ts が有効な PluginDefinition を export していません: ${pluginTsPath}`);
  }

  // 各スキルを LoadedSkillUnion に変換
  const skills: LoadedSkillUnion[] = await Promise.all(
    pluginDef.skills.map(async (skill: ImportedSkill) => {
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

      // ImportedStep[] → LoadedStep[] への再帰的変換
      const loadedSteps = skill.steps ? convertImportedSteps(skill.steps) : undefined;

      // dependencies の解決: 明示的指定があればそれを使い、なければ steps から自動導出
      const dependencies = skill.dependencies?.map(d => d.name)
        ?? (loadedSteps ? collectSkillNamesFromLoadedSteps(loadedSteps) : undefined);

      // 基本フィールド
      const base = {
        skillType: skill.skillType,
        name: skill.name,
        content: skill.content ?? "",
        description: skill.description,
        input: skill.input,
        output: skill.output,
        allowedTools: skill.allowedTools,
        argumentHint: skill.argumentHint,
        files: loadedFiles,
        dependencies,
        steps: loadedSteps,
        sections: skill.sections,
      };

      // skillType に応じた拡張
      if (skill.skillType === "WORKER_WITH_SUB_AGENT" && skill.agentConfig) {
        const loaded: LoadedWorkerWithSubAgentSkill = {
          ...base,
          skillType: "WORKER_WITH_SUB_AGENT" as const,
          agentConfig: skill.agentConfig,
        };
        if (skill.workerSteps) {
          loaded.workerSteps = skill.workerSteps;
        }
        if (skill.workerSections) {
          loaded.workerSections = skill.workerSections.map(s => ({
            heading: s.heading,
            body: s.body,
            position: s.position,
          }));
        }
        return loaded;
      }

      if (skill.skillType === "WORKER_WITH_AGENT_TEAM") {
        // teammates がある場合は teammates から agentTeamMembers を導出
        if (skill.teammates) {
          const loadedTeammates: LoadedTeammate[] = skill.teammates.map(t => ({
            name: t.name,
            role: t.role,
            steps: t.steps,
            sortOrder: t.sortOrder,
            communicationPattern: t.communicationPattern,
          }));
          const agentTeamMembers: AgentTeamMember[] = loadedTeammates.map(t => ({
            skillName: t.name,
            sortOrder: t.sortOrder,
          }));
          return {
            ...base,
            skillType: "WORKER_WITH_AGENT_TEAM" as const,
            agentTeamMembers,
            teammates: loadedTeammates,
            teamPrefix: skill.teamPrefix,
            requiresUserApproval: skill.requiresUserApproval,
          } satisfies LoadedWorkerWithAgentTeamSkill;
        }
        // 後方互換: agentTeamMembers を直接使用
        if (skill.agentTeamMembers) {
          return {
            ...base,
            skillType: "WORKER_WITH_AGENT_TEAM" as const,
            agentTeamMembers: skill.agentTeamMembers,
          } satisfies LoadedWorkerWithAgentTeamSkill;
        }
      }

      return {
        ...base,
        skillType: skill.skillType as "ENTRY_POINT" | "WORKER",
      } satisfies LoadedSkill;
    }),
  );

  return {
    name: pluginDef.name,
    description: pluginDef.description,
    skills,
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
    const jiti = createJiti(import.meta.url);
    const mod = await jiti.import(pluginTsPath) as Record<string, unknown>;
    const def = mod.default as ImportedPluginDefinition | undefined;
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

// ImportedStep[] → LoadedStep[] への再帰的変換
function convertImportedSteps(steps: ImportedStep[]): LoadedStep[] {
  return steps.map((step): LoadedStep => {
    if (isImportedBranch(step)) {
      const cases: Record<string, LoadedStep[]> = {};
      for (const [caseName, caseSteps] of Object.entries(step.cases)) {
        cases[caseName] = convertImportedSteps(caseSteps);
      }
      const loaded: LoadedBranch = { decisionPoint: step.decisionPoint, cases };
      if (step.description) loaded.description = step.description;
      return loaded;
    }
    if (isImportedInlineStep(step)) {
      const loaded: LoadedInlineStep = { inline: step.inline };
      if (step.description) loaded.description = step.description;
      if (step.input) loaded.input = step.input;
      if (step.output) loaded.output = step.output;
      return loaded;
    }
    return step.name;
  });
}

// LoadedStep[] から全スキル名を再帰的にフラット収集する（重複除去）
function collectSkillNamesFromLoadedSteps(steps: LoadedStep[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const step of steps) {
    if (isLoadedBranch(step)) {
      for (const caseSteps of Object.values(step.cases)) {
        for (const name of collectSkillNamesFromLoadedSteps(caseSteps)) {
          if (!seen.has(name)) {
            seen.add(name);
            result.push(name);
          }
        }
      }
    } else if (isLoadedInlineStep(step)) {
      // インラインステップはスキル参照ではないのでスキップ
      continue;
    } else {
      if (!seen.has(step)) {
        seen.add(step);
        result.push(step);
      }
    }
  }
  return result;
}
