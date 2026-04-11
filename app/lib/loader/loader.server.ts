// プラグイン定義ローダー
// .server.ts サフィックス: Node.js ファイルシステム API を使うため（Remix の慣習に準拠）

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createJiti } from "jiti";
import type {
  ToolRef,
  AgentConfig,
  SupportFile,
  DelegateStep,
  Section,
} from "../types/skill";
import { SKILL_TYPES } from "../types/constants";
import type { MarketplaceDefinition } from "../types/marketplace";
import type {
  LoadedSupportFile,
  LoadedBranch,
  LoadedInlineStep,
  LoadedStep,
  LoadedSkill,
  LoadedWorkerWithSubAgentSkill,
  LoadedWorkerWithAgentTeamSkill,
  LoadedSkillUnion,
  LoadedPluginDefinition,
  LoadedTeammate,
  LoadedHookDefinition,
  LoadedHookScript,
} from "../types/loaded";
import type { HookDefinition } from "../types/plugin";
import { isLoadedBranch, isLoadedInlineStep } from "../types/loaded";

// import 用の分岐ステップ型
interface ImportedBranch {
  decisionPoint: string;
  description?: string;
  cases: Record<string, ImportedStep[]>;
}

// import 用の委譲ステップ型（InlineStep / Teammate 共通）
interface ImportedDelegateStep {
  id: string;
  title: string;
  body: string;
}

// import 用のインラインステップ型
interface ImportedInlineStep {
  inline: string;
  steps: ImportedDelegateStep[];
  input?: string[];
  output?: string[];
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

// 動的importで読み込まれるスキルの共通フィールド
interface ImportedSkillBase {
  name: string;
  description?: string;
  input?: string[];
  output?: string[];
  allowedTools?: ToolRef[];
  argumentHint?: string;
  userInvocable?: boolean;
  disableModelInvocation?: boolean;
  files?: SupportFile[];
  dependencies?: { name: string }[];
  steps?: ImportedStep[];
  beforeSections?: Section[];
  afterSections?: Section[];
}

// ENTRY_POINT / WORKER の場合
interface ImportedSimpleSkill extends ImportedSkillBase {
  skillType: typeof SKILL_TYPES.ENTRY_POINT | typeof SKILL_TYPES.WORKER;
  workerSteps?: DelegateStep[];
}

// WORKER_WITH_SUB_AGENT の場合は agentConfig を保持
interface ImportedWorkerWithSubAgentSkill extends ImportedSkillBase {
  skillType: typeof SKILL_TYPES.WORKER_WITH_SUB_AGENT;
  agentConfig: AgentConfig;
  workerSteps: DelegateStep[];
}

// WORKER_WITH_AGENT_TEAM の場合は teammates を保持
interface ImportedWorkerWithAgentTeamSkill extends ImportedSkillBase {
  skillType: typeof SKILL_TYPES.WORKER_WITH_AGENT_TEAM;
  teammates: ImportedTeammate[];
  teamPrefix: string;
  additionalLeaderSteps?: string[];
  requiresUserApproval?: boolean;
}

// discriminated union: skillType で型が絞り込まれる
type ImportedSkill =
  | ImportedSimpleSkill
  | ImportedWorkerWithSubAgentSkill
  | ImportedWorkerWithAgentTeamSkill;

// import 用のチームメンバー型
interface ImportedTeammate {
  name: string;
  role: string;
  steps: ImportedDelegateStep[];
  sortOrder?: number;
}

// 動的importで読み込まれるプラグイン定義の型
interface ImportedPluginDefinition {
  name: string;
  description?: string;
  skills: ImportedSkill[];
  hooks?: HookDefinition;
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
  const pluginModule = (await jiti.import(pluginTsPath)) as Record<
    string,
    unknown
  >;
  const pluginDef = pluginModule.default as
    | ImportedPluginDefinition
    | undefined;

  if (!pluginDef || !pluginDef.name || !Array.isArray(pluginDef.skills)) {
    throw new Error(
      `plugin.ts が有効な PluginDefinition を export していません: ${pluginTsPath}`,
    );
  }

  // 各スキルを LoadedSkillUnion に変換
  const skills: LoadedSkillUnion[] = await Promise.all(
    pluginDef.skills.map(async (skill: ImportedSkill) => {
      // サポートファイルの読み込み
      const loadedFiles: LoadedSupportFile[] = [];
      if (skill.files && Array.isArray(skill.files)) {
        for (const file of skill.files) {
          const filePath = path.join(
            dirPath,
            "skills",
            skill.name,
            file.filename,
          );
          try {
            const content = await fs.readFile(filePath, "utf-8");
            loadedFiles.push({
              role: file.role,
              filename: file.filename,
              content,
              sortOrder: file.sortOrder,
            });
          } catch {
            throw new Error(`サポートファイルが見つかりません: ${filePath}`);
          }
        }
      }

      // ImportedStep[] → LoadedStep[] への再帰的変換
      const loadedSteps = skill.steps
        ? convertImportedSteps(skill.steps)
        : undefined;

      // dependencies の解決: 明示的指定があればそれを使い、なければ steps から自動導出
      const dependencies =
        skill.dependencies?.map((d) => d.name) ??
        (loadedSteps
          ? collectSkillNamesFromLoadedSteps(loadedSteps)
          : undefined);

      // 基本フィールド
      const base = {
        skillType: skill.skillType,
        name: skill.name,
        description: skill.description,
        input: skill.input,
        output: skill.output,
        allowedTools: skill.allowedTools,
        argumentHint: skill.argumentHint,
        userInvocable: skill.userInvocable,
        disableModelInvocation: skill.disableModelInvocation,
        files: loadedFiles,
        dependencies,
        steps: loadedSteps,
        beforeSections: skill.beforeSections ? skill.beforeSections : undefined,
        afterSections: skill.afterSections ? skill.afterSections : undefined,
      };

      // skillType に応じた拡張
      if (skill.skillType === SKILL_TYPES.WORKER_WITH_SUB_AGENT) {
        return {
          ...base,
          skillType: SKILL_TYPES.WORKER_WITH_SUB_AGENT,
          agentConfig: skill.agentConfig,
          workerSteps: skill.workerSteps,
        } satisfies LoadedWorkerWithSubAgentSkill;
      }

      if (skill.skillType === SKILL_TYPES.WORKER_WITH_AGENT_TEAM) {
        const loadedTeammates: LoadedTeammate[] = skill.teammates.map((t) => ({
          name: t.name,
          role: t.role,
          steps: t.steps,
          sortOrder: t.sortOrder,
        }));
        return {
          ...base,
          skillType: SKILL_TYPES.WORKER_WITH_AGENT_TEAM,
          teammates: loadedTeammates,
          teamPrefix: skill.teamPrefix,
          additionalLeaderSteps: skill.additionalLeaderSteps,
          requiresUserApproval: skill.requiresUserApproval,
        } satisfies LoadedWorkerWithAgentTeamSkill;
      }

      const loaded: LoadedSkill = {
        ...base,
        skillType: skill.skillType as
          | typeof SKILL_TYPES.ENTRY_POINT
          | typeof SKILL_TYPES.WORKER,
      };
      if (skill.workerSteps) {
        loaded.workerSteps = skill.workerSteps;
      }
      return loaded satisfies LoadedSkill;
    }),
  );

  // hooks の読み込み（スクリプトファイルの内容を解決）
  let loadedHooks: LoadedHookDefinition | undefined;
  if (pluginDef.hooks) {
    loadedHooks = await loadHookDefinition(dirPath, pluginDef.hooks);
  }

  return {
    name: pluginDef.name,
    description: pluginDef.description,
    skills,
    hooks: loadedHooks,
  };
}

// プラグインのメタデータのみを軽量に取得する（一覧表示用）
export interface PluginMeta {
  dirName: string;
  name: string;
  description: string | null;
  skillCount: number;
}

export async function loadPluginMeta(
  dirPath: string,
  dirName: string,
): Promise<PluginMeta | null> {
  const pluginTsPath = path.join(dirPath, "plugin.ts");
  try {
    await fs.access(pluginTsPath);
    const jiti = createJiti(import.meta.url);
    const mod = (await jiti.import(pluginTsPath)) as Record<string, unknown>;
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

// marketplace のメタデータ型（一覧表示用）
export interface MarketplaceMeta {
  dirName: string;
  pluginCount: number;
}

// marketplace のメタデータを取得する
async function loadMarketplaceMeta(
  dirPath: string,
  dirName: string,
): Promise<MarketplaceMeta | null> {
  const pluginsDir = path.join(dirPath, "plugins");
  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
    const pluginCount = entries.filter((e) => e.isDirectory()).length;
    return { dirName, pluginCount };
  } catch {
    return null;
  }
}

// マーケットプレース探索ベースディレクトリを取得する
// SKILLSMITH_MARKETPLACES_DIR 環境変数で上書き可能
export function getMarketplacesBaseDir(): string {
  return (
    process.env.SKILLSMITH_MARKETPLACES_DIR ??
    path.join(process.cwd(), "marketplaces")
  );
}

// 全 marketplace のメタデータを取得する（一覧表示用）
export async function loadAllMarketplaceMeta(): Promise<MarketplaceMeta[]> {
  const marketplacesDir = getMarketplacesBaseDir();
  let dirEntries: string[] = [];
  try {
    const entries = await fs.readdir(marketplacesDir, { withFileTypes: true });
    dirEntries = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const results = await Promise.all(
    dirEntries.map((dirName) =>
      loadMarketplaceMeta(path.join(marketplacesDir, dirName), dirName),
    ),
  );
  return results.filter((r): r is MarketplaceMeta => r !== null);
}

// 特定 marketplace 内の全プラグインメタデータを取得する
export async function loadAllPluginMetaInMarketplace(
  marketplaceDirPath: string,
): Promise<PluginMeta[]> {
  const pluginsDir = path.join(marketplaceDirPath, "plugins");
  let dirEntries: string[] = [];
  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
    dirEntries = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const results = await Promise.all(
    dirEntries.map((dirName) =>
      loadPluginMeta(path.join(pluginsDir, dirName), dirName),
    ),
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
      const loaded: LoadedBranch = {
        decisionPoint: step.decisionPoint,
        cases,
      };
      if (step.description) loaded.description = step.description;
      return loaded;
    }
    if (isImportedInlineStep(step)) {
      const loaded: LoadedInlineStep = {
        inline: step.inline,
        steps: step.steps,
      };
      if (step.input) loaded.input = step.input;
      if (step.output) loaded.output = step.output;
      return loaded;
    }
    return { skillName: step.name };
  });
}

// マーケットプレイス定義を読み込む
export async function loadMarketplaceDefinition(
  marketplaceDirPath: string,
): Promise<MarketplaceDefinition> {
  const marketplaceTsPath = path.join(marketplaceDirPath, "marketplace.ts");

  // marketplace.ts の存在チェック
  try {
    await fs.access(marketplaceTsPath);
  } catch {
    throw new Error(`marketplace.ts が見つかりません: ${marketplaceTsPath}`);
  }

  // marketplace.ts を動的importで読み込む
  const jiti = createJiti(import.meta.url);
  const mod = (await jiti.import(marketplaceTsPath)) as Record<string, unknown>;
  const def = mod.default as MarketplaceDefinition | undefined;

  if (!def) {
    throw new Error(
      `marketplace.ts が有効な MarketplaceDefinition を default export していません: ${marketplaceTsPath}`,
    );
  }

  return def;
}

// フック定義を読み込み、スクリプトファイルの内容を解決する
async function loadHookDefinition(
  pluginDir: string,
  hookDef: HookDefinition,
): Promise<LoadedHookDefinition> {
  const loadedScripts: LoadedHookScript[] = [];

  if (hookDef.scripts) {
    for (const script of hookDef.scripts) {
      let content: string;
      if (script.contentFile) {
        const filePath = path.join(pluginDir, script.contentFile);
        try {
          content = await fs.readFile(filePath, "utf-8");
        } catch {
          throw new Error(`フックスクリプトが見つかりません: ${filePath}`);
        }
      } else if (script.content) {
        content = script.content;
      } else {
        throw new Error(
          `フックスクリプト "${script.filename}" に content または contentFile が必要です`,
        );
      }
      loadedScripts.push({ filename: script.filename, content });
    }
  }

  return {
    description: hookDef.description,
    hooks: hookDef.hooks,
    scripts: loadedScripts.length > 0 ? loadedScripts : undefined,
  };
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
      if (!seen.has(step.skillName)) {
        seen.add(step.skillName);
        result.push(step.skillName);
      }
    }
  }
  return result;
}
