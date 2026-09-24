// 型定義の公開APIエクスポート

// Skill 関連
export {
  Skill,
  EntryPointSkill,
  WorkerSkill,
  WorkerWithSubAgent,
  WorkerWithAgentTeam,
} from "./skill";
export type {
  ToolRef,
  SupportFile,
  AgentConfig,
  DelegateStep,
  Teammate,
  SkillType,
  ModelSpec,
  SkillModel,
  EffortLevel,
  AgentPermissionMode,
  AgentMemoryScope,
  Branch,
  InlineStep,
  Step,
  Section,
} from "./skill";
export {
  tool,
  bash,
  mcp,
  serializeToolRef,
} from "./skill";

// Plugin 関連
export type {
  PluginDefinition,
  PluginAuthor,
  HookDefinition,
  HookEventMap,
  HookEvent,
  HookType,
  HookEntry,
  HookAction,
  CommandHookAction,
  HttpHookAction,
  McpToolHookAction,
  PromptHookAction,
  AgentHookAction,
  HookScript,
} from "./plugin";

// Marketplace 関連
export type {
  MarketplaceDefinition,
  MarketplacePluginEntry,
  MarketplaceJson,
} from "./marketplace";

// Loaded系型・型ガード
export type {
  LoadedSupportFile,
  LoadedSkill,
  LoadedWorkerWithSubAgentSkill,
  LoadedWorkerWithAgentTeamSkill,
  LoadedSkillUnion,
  LoadedPluginDefinition,
  LoadedBranch,
  LoadedInlineStep,
  LoadedStep,
  LoadedSection,
  LoadedTeammate,
  LoadedDelegateStep,
  LoadedWorkerStep,
  SkillRef,
} from "./loaded";
export { isLoadedBranch, isLoadedInlineStep, isLoadedSkillRef } from "./loaded";
