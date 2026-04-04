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
  OrchestratorSection,
  SectionPosition,
  CommunicationPattern,
} from "./skill";
import type { MarketplaceDefinition } from "./marketplace";
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
} from "./loaded";
import { isLoadedBranch, isLoadedInlineStep } from "./loaded";

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
  body?: string;
  bodyFile?: string;
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
  displayName?: string;
  content?: string;
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
  sections?: {
    heading: string;
    body?: string;
    bodyFile?: string;
    position: SectionPosition;
  }[];
}

// ENTRY_POINT / WORKER の場合
interface ImportedSimpleSkill extends ImportedSkillBase {
  skillType: "ENTRY_POINT" | "WORKER";
}

// WORKER_WITH_SUB_AGENT の場合は agentConfig を保持
interface ImportedWorkerWithSubAgentSkill extends ImportedSkillBase {
  skillType: "WORKER_WITH_SUB_AGENT";
  agentConfig: AgentConfig;
  workerSteps?: DelegateStep[];
  workerSections?: OrchestratorSection[];
}

// WORKER_WITH_AGENT_TEAM の場合は teammates を保持
interface ImportedWorkerWithAgentTeamSkill extends ImportedSkillBase {
  skillType: "WORKER_WITH_AGENT_TEAM";
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
  communicationPattern?: CommunicationPattern;
}

// 動的importで読み込まれるプラグイン定義の型
interface ImportedPluginDefinition {
  name: string;
  description?: string;
  skills: ImportedSkill[];
}


// bodyFile を解決してbodyに設定するヘルパー
// bodyFile が指定されている場合、スキルディレクトリから相対パスでファイルを読み込む
async function resolveBodyFile(
  skillDir: string,
  item: { body?: string; bodyFile?: string },
): Promise<{ body: string; bodyFile?: string }> {
  if (item.bodyFile) {
    const filePath = path.join(skillDir, item.bodyFile);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return { body: content, bodyFile: item.bodyFile };
    } catch {
      throw new Error(`bodyFile が見つかりません: ${filePath}`);
    }
  }
  return { body: item.body ?? "" };
}

// bodyFile を含む任意のオブジェクト配列の bodyFile を一括解決するジェネリックヘルパー
async function resolveBodyFiles<T extends { body?: string; bodyFile?: string }>(
  skillDir: string,
  items: T[],
): Promise<(Omit<T, "body" | "bodyFile"> & { body: string; bodyFile?: string })[]> {
  return Promise.all(
    items.map(async (item) => {
      const { body: _body, bodyFile: _bodyFile, ...rest } = item;
      const resolved = await resolveBodyFile(skillDir, item);
      return { ...rest, ...resolved } as Omit<T, "body" | "bodyFile"> & { body: string; bodyFile?: string };
    }),
  );
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

      // スキルディレクトリのパス（bodyFile 解決に使用）
      const skillDir = path.join(dirPath, "skills", skill.name);

      // ImportedStep[] → LoadedStep[] への再帰的変換（bodyFile 解決を含む）
      const loadedSteps = skill.steps
        ? await convertImportedStepsAsync(skill.steps, skillDir)
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
        displayName: skill.displayName,
        content: skill.content ?? "",
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
        sections: skill.sections
          ? await resolveBodyFiles(skillDir, skill.sections)
          : undefined,
      };

      // skillType に応じた拡張
      if (skill.skillType === "WORKER_WITH_SUB_AGENT") {
        const loaded: LoadedWorkerWithSubAgentSkill = {
          ...base,
          skillType: "WORKER_WITH_SUB_AGENT" as const,
          agentConfig: skill.agentConfig,
        };
        if (skill.workerSteps) {
          loaded.workerSteps = await resolveBodyFiles(
            skillDir,
            skill.workerSteps,
          );
        }
        if (skill.workerSections) {
          loaded.workerSections = await resolveBodyFiles(
            skillDir,
            skill.workerSections,
          );
        }
        return loaded;
      }

      if (skill.skillType === "WORKER_WITH_AGENT_TEAM") {
        const loadedTeammates: LoadedTeammate[] = await Promise.all(
          skill.teammates.map(async (t) => ({
            name: t.name,
            role: t.role,
            steps: await resolveBodyFiles(skillDir, t.steps),
            sortOrder: t.sortOrder,
            communicationPattern: t.communicationPattern,
          })),
        );
        return {
          ...base,
          skillType: "WORKER_WITH_AGENT_TEAM" as const,
          teammates: loadedTeammates,
          teamPrefix: skill.teamPrefix,
          additionalLeaderSteps: skill.additionalLeaderSteps,
          requiresUserApproval: skill.requiresUserApproval,
        } satisfies LoadedWorkerWithAgentTeamSkill;
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

// 全 marketplace のメタデータを取得する（一覧表示用）
export async function loadAllMarketplaceMeta(): Promise<MarketplaceMeta[]> {
  const marketplacesDir = path.join(process.cwd(), "marketplaces");
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

// ImportedStep[] → LoadedStep[] への再帰的変換（bodyFile 解決を含む非同期版）
async function convertImportedStepsAsync(
  steps: ImportedStep[],
  skillDir: string,
): Promise<LoadedStep[]> {
  return Promise.all(
    steps.map(async (step): Promise<LoadedStep> => {
      if (isImportedBranch(step)) {
        const cases: Record<string, LoadedStep[]> = {};
        for (const [caseName, caseSteps] of Object.entries(step.cases)) {
          cases[caseName] = await convertImportedStepsAsync(
            caseSteps,
            skillDir,
          );
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
          steps: await resolveBodyFiles(skillDir, step.steps),
        };
        if (step.input) loaded.input = step.input;
        if (step.output) loaded.output = step.output;
        return loaded;
      }
      return { skillName: step.name };
    }),
  );
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
    throw new Error(
      `marketplace.ts が見つかりません: ${marketplaceTsPath}`,
    );
  }

  // marketplace.ts を動的importで読み込む
  const jiti = createJiti(import.meta.url);
  const mod = (await jiti.import(marketplaceTsPath)) as Record<
    string,
    unknown
  >;
  const def = mod.default as MarketplaceDefinition | undefined;

  if (!def) {
    throw new Error(
      `marketplace.ts が有効な MarketplaceDefinition を default export していません: ${marketplaceTsPath}`,
    );
  }

  return def;
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
