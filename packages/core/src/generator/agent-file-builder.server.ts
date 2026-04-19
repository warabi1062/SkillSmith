// Agent/Teammate agent ファイルの frontmatter 組み立てと本文結合を担う共通ヘルパー
// frontmatter シリアライズと ToolRef → string[] 変換を 1 箇所に集約する

import { serializeFrontmatter } from "../core/frontmatter.server";
import { serializeToolRef, type ToolRef } from "../types/skill";

export interface AgentFileInput {
  name: string;
  description: string;
  model?: string;
  tools?: ToolRef[];
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
  if (input.tools && input.tools.length > 0) {
    fields.tools = input.tools.map(serializeToolRef);
  }
  if (input.skills && input.skills.length > 0) {
    fields.skills = input.skills;
  }
  const frontmatter = serializeFrontmatter(fields);
  return `${frontmatter}\n\n${input.body}\n`;
}
