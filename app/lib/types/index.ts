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
  SupportFileRole,
  SupportFile,
  AgentConfig,
  DelegateStep,
  Teammate,
  SkillType,
  Branch,
  InlineStep,
  Step,
  OrchestratorSection,
  CommunicationPattern,
} from "./skill";
export {
  tool,
  bash,
  mcp,
  serializeToolRef,
  parseToolRef,
  isBranch,
  isInlineStep,
  collectSkillsFromSteps,
} from "./skill";

// Plugin 関連
export type { PluginDefinition } from "./plugin";

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
  LoadedOrchestratorSection,
  LoadedTeammate,
  LoadedDelegateStep,
  LoadedWorkerStep,
  SkillRef,
} from "./loaded";
export { isLoadedBranch, isLoadedInlineStep, isLoadedSkillRef } from "./loaded";

