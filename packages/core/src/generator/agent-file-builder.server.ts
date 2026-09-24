// Agent/Teammate agent ファイルの frontmatter 組み立てと本文結合を担う共通ヘルパー
// frontmatter シリアライズと ToolRef → string[] 変換を 1 箇所に集約する

import { serializeFrontmatter } from "../core/frontmatter.server";
import { serializeToolRef, type ToolRef } from "../types/skill";

// frontmatter フィールドは Claude Code の sub-agents 仕様（https://code.claude.com/docs/en/sub-agents）に準拠
export interface AgentFileInput {
  name: string;
  description: string;
  model?: string;
  effort?: string;
  tools?: ToolRef[];
  disallowedTools?: ToolRef[];
  permissionMode?: string;
  maxTurns?: number;
  memory?: string;
  isolation?: "worktree";
  skills?: string[];
  body: string;
}

export function buildAgentFileContent(input: AgentFileInput): string {
  const fields: Record<
    string,
    string | number | boolean | string[] | null | undefined
  > = {
    name: input.name,
    description: input.description,
  };
  if (input.model) {
    fields.model = input.model;
  }
  if (input.effort) {
    fields.effort = input.effort;
  }
  if (input.tools && input.tools.length > 0) {
    fields.tools = input.tools.map(serializeToolRef);
  }
  if (input.disallowedTools && input.disallowedTools.length > 0) {
    fields.disallowedTools = input.disallowedTools.map(serializeToolRef);
  }
  if (input.permissionMode) {
    fields.permissionMode = input.permissionMode;
  }
  if (input.maxTurns !== undefined) {
    fields.maxTurns = input.maxTurns;
  }
  if (input.memory) {
    fields.memory = input.memory;
  }
  if (input.isolation) {
    fields.isolation = input.isolation;
  }
  if (input.skills && input.skills.length > 0) {
    fields.skills = input.skills;
  }
  const frontmatter = serializeFrontmatter(fields);
  return `${frontmatter}\n\n${input.body}\n`;
}
