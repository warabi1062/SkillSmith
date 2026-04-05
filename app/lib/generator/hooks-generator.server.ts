// hooks/hooks.json とスクリプトファイルの生成

import type { GeneratedFile, GenerationValidationError } from "./types";
import type { LoadedHookDefinition } from "../types/loaded";
import { FILE_PATHS } from "../types/constants";

export interface GenerateHooksResult {
  files: GeneratedFile[];
  errors: GenerationValidationError[];
}

/**
 * LoadedHookDefinition から hooks/hooks.json とスクリプトファイルを生成する。
 */
export function generateHooks(
  hookDef: LoadedHookDefinition,
): GenerateHooksResult {
  const files: GeneratedFile[] = [];
  const errors: GenerationValidationError[] = [];

  // hooks/hooks.json の生成
  const hooksJsonContent: Record<string, unknown> = {};
  if (hookDef.description) {
    hooksJsonContent.description = hookDef.description;
  }
  hooksJsonContent.hooks = hookDef.hooks;

  files.push({
    path: FILE_PATHS.HOOKS_JSON,
    content: JSON.stringify(hooksJsonContent, null, 2) + "\n",
  });

  // スクリプトファイルの生成
  if (hookDef.scripts) {
    for (const script of hookDef.scripts) {
      files.push({
        path: `${FILE_PATHS.SCRIPTS_DIR}${script.filename}`,
        content: script.content,
      });
    }
  }

  return { files, errors };
}
