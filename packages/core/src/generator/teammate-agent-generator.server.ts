// Teammate 1 名分の agent.md を生成する
// 生成規約: agents/{skillName}-{teammate.name}.md
// frontmatter.name も同じ prefix 付きにして subagent_type と一致させる

import type { LoadedTeammate } from "../types/loaded";
import type { GeneratedFile, GenerationValidationError } from "./types";
import { buildAgentFileContent } from "./agent-file-builder.server";
import { buildMemberConstraints } from "./team-content-generator";
import { FILE_PATHS } from "../types/constants";

export function generateTeammateAgentMd(
  skillName: string,
  teammate: LoadedTeammate,
): { file: GeneratedFile; errors: GenerationValidationError[] } {
  const prefixedName = `${skillName}-${teammate.name}`;
  const body = renderTeammateBody(teammate);
  const content = buildAgentFileContent({
    name: prefixedName,
    description: teammate.role,
    model: teammate.model,
    tools: teammate.tools,
    body,
  });
  return {
    file: {
      path: `${FILE_PATHS.AGENTS_DIR}${prefixedName}.md`,
      content,
      skillName,
    },
    errors: [],
  };
}

// teammate agent の本文を `## 役割 / ## 制約 / ## 手順` の 3 ブロックで組み立てる
function renderTeammateBody(teammate: LoadedTeammate): string {
  const lines: string[] = [];
  lines.push("## 役割");
  lines.push(teammate.role);
  lines.push("");
  lines.push("## 制約");
  for (const constraint of buildMemberConstraints()) {
    lines.push(`- ${constraint}`);
  }
  lines.push("");
  lines.push("## 手順");
  for (const step of teammate.steps) {
    lines.push("");
    lines.push(`### ${step.id}. ${step.title}`);
    lines.push(step.body);
  }
  return lines.join("\n");
}
