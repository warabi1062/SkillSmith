// 文字列リテラルの定数オブジェクト定義
// 型定義と実行時の両方で使用し、型安全性と変更耐性を担保する

export const SKILL_TYPES = {
  ENTRY_POINT: "ENTRY_POINT",
  WORKER: "WORKER",
  WORKER_WITH_SUB_AGENT: "WORKER_WITH_SUB_AGENT",
  WORKER_WITH_AGENT_TEAM: "WORKER_WITH_AGENT_TEAM",
} as const;

export const TOOL_REF_TYPES = {
  TOOL: "tool",
  MCP: "mcp",
} as const;

export const COMMUNICATION_PATTERNS = {
  POLLER: "poller",
  RESPONDER: "responder",
} as const;

export const SECTION_POSITIONS = {
  BEFORE_STEPS: "before-steps",
  AFTER_STEPS: "after-steps",
  BEFORE_STEP_PREFIX: "before-step:",
  AFTER_STEP_PREFIX: "after-step:",
} as const;

export const SUPPORT_FILE_ROLES = {
  TEMPLATE: "TEMPLATE",
  REFERENCE: "REFERENCE",
  EXAMPLE: "EXAMPLE",
} as const;

export const ERROR_CODES = {
  INVALID_SKILL_NAME: "INVALID_SKILL_NAME",
  EMPTY_CONTENT: "EMPTY_CONTENT",
  NO_TEAM_MEMBERS: "NO_TEAM_MEMBERS",
  EMPTY_PLUGIN: "EMPTY_PLUGIN",
  DIRECTORY_STRUCTURE_MISMATCH: "DIRECTORY_STRUCTURE_MISMATCH",
  DUPLICATE_FILE_PATH: "DUPLICATE_FILE_PATH",
  MISSING_DEPENDENCY_TARGET: "MISSING_DEPENDENCY_TARGET",
  MISSING_PLUGIN_NAME: "MISSING_PLUGIN_NAME",
  MARKETPLACE_NAME_REQUIRED: "MARKETPLACE_NAME_REQUIRED",
  MARKETPLACE_NO_PLUGINS: "MARKETPLACE_NO_PLUGINS",
} as const;

export const FILE_PATHS = {
  PLUGIN_JSON: ".claude-plugin/plugin.json",
  MARKETPLACE_JSON: ".claude-plugin/marketplace.json",
  SKILLS_DIR: "skills/",
  AGENTS_DIR: "agents/",
  HOOKS_DIR: "hooks/",
  SCRIPTS_DIR: "scripts/",
  HOOKS_JSON: "hooks/hooks.json",
  SKILL_MD: "SKILL.md",
} as const;

export const FRONTMATTER_FIELDS = {
  ARGUMENT_HINT: "argument-hint",
  USER_INVOCABLE: "user-invocable",
  DISABLE_MODEL_INVOCATION: "disable-model-invocation",
  ALLOWED_TOOLS: "allowed-tools",
} as const;
