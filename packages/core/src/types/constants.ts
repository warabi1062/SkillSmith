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
  // hooks 関連
  HOOK_UNKNOWN_EVENT: "HOOK_UNKNOWN_EVENT",
  HOOK_EMPTY_ENTRY: "HOOK_EMPTY_ENTRY",
  HOOK_IF_NOT_ALLOWED: "HOOK_IF_NOT_ALLOWED",
  HOOK_MCP_TOOL_NOT_ALLOWED: "HOOK_MCP_TOOL_NOT_ALLOWED",
  HOOK_AGENT_NOT_ALLOWED: "HOOK_AGENT_NOT_ALLOWED",
  HOOK_MISSING_SCRIPT: "HOOK_MISSING_SCRIPT",
  HOOK_UNQUOTED_PLUGIN_ROOT: "HOOK_UNQUOTED_PLUGIN_ROOT",
} as const;

export const FILE_PATHS = {
  PLUGIN_JSON: ".claude-plugin/plugin.json",
  MARKETPLACE_JSON: ".claude-plugin/marketplace.json",
  SKILLS_DIR: "skills/",
  AGENTS_DIR: "agents/",
  SCRIPTS_DIR: "scripts/",
  HOOKS_JSON: "hooks/hooks.json",
  SKILL_MD: "SKILL.md",
} as const;

export const FRONTMATTER_FIELDS = {
  ARGUMENT_HINT: "argument-hint",
  USER_INVOCABLE: "user-invocable",
  DISABLE_MODEL_INVOCATION: "disable-model-invocation",
  MODEL: "model",
  ALLOWED_TOOLS: "allowed-tools",
} as const;

// ---- hooks 関連 ----
// Claude Code の hooks 仕様に準拠（https://code.claude.com/docs/en/hooks）

// フックアクションの種類
export const HOOK_TYPES = {
  COMMAND: "command",
  HTTP: "http",
  MCP_TOOL: "mcp_tool",
  PROMPT: "prompt",
  AGENT: "agent",
} as const;

// Claude Code が発火するフックイベント名の一覧
// 未知のイベント名は生成時に警告扱いとし、Claude Code 側の新イベントを先行利用できるようにする
export const HOOK_EVENTS = [
  // セッション単位
  "SessionStart",
  "Setup",
  "SessionEnd",
  // ターン単位
  "UserPromptSubmit",
  "UserPromptExpansion",
  "Stop",
  "StopFailure",
  // ツール呼び出し単位
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PostToolBatch",
  "PermissionRequest",
  "PermissionDenied",
  // サブエージェント
  "SubagentStart",
  "SubagentStop",
  // その他
  "Notification",
  "MessageDisplay",
  "TeammateIdle",
  "PreCompact",
  "PostCompact",
  "PreModelSwitch",
  "PostModelSwitch",
  "ConfigChange",
  "DirectoryAdded",
  "FileChanged",
  "CwdChanged",
  "InstructionsLoaded",
  "TaskCreated",
  "TaskCompleted",
  "WorktreeCreate",
  "WorktreeRemove",
  "Elicitation",
  "ElicitationResult",
] as const;

// `if` フィールド（permission rule 構文による絞り込み）が使えるツール系イベント
export const HOOK_IF_ALLOWED_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "PermissionDenied",
] as const;

// `mcp_tool` 型が使えないイベント（MCP サーバー接続前に発火するため）
export const HOOK_MCP_TOOL_DISALLOWED_EVENTS = [
  "SessionStart",
  "Setup",
] as const;

// `agent` 型が使えないイベント（command / http 型のみ許可）
export const HOOK_AGENT_DISALLOWED_EVENTS = ["PermissionRequest"] as const;
