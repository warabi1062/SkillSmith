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
