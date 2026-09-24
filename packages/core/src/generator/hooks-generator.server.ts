// hooks/hooks.json とスクリプトファイルの生成
// Claude Code の hooks 仕様に準拠（https://code.claude.com/docs/en/hooks）

import type { GeneratedFile, GenerationValidationError } from "./types";
import type { LoadedHookDefinition } from "../types/loaded";
import type { HookAction } from "../types/plugin";
import {
  ERROR_CODES,
  FILE_PATHS,
  HOOK_AGENT_DISALLOWED_EVENTS,
  HOOK_EVENTS,
  HOOK_IF_ALLOWED_EVENTS,
  HOOK_MCP_TOOL_DISALLOWED_EVENTS,
  HOOK_TYPES,
} from "../types/constants";

export interface GenerateHooksResult {
  files: GeneratedFile[];
  errors: GenerationValidationError[];
}

// command 内の "${CLAUDE_PLUGIN_ROOT}/scripts/{name}" 参照からスクリプト名を抜き出す
const SCRIPT_REF_PATTERN =
  /\$\{CLAUDE_PLUGIN_ROOT\}"?\/scripts\/([A-Za-z0-9._-]+)/g;

// クォートされていない ${CLAUDE_PLUGIN_ROOT}（直前が " でも ' でもない）
const UNQUOTED_PLUGIN_ROOT_PATTERN = /(?<!["'])\$\{CLAUDE_PLUGIN_ROOT\}/;

/**
 * LoadedHookDefinition から hooks/hooks.json とスクリプトファイルを生成する。
 * 仕様違反はバリデーションエラー・警告として返し、ファイル自体は生成する。
 */
export function generateHooks(
  hookDef: LoadedHookDefinition,
): GenerateHooksResult {
  const files: GeneratedFile[] = [];
  const errors: GenerationValidationError[] = validateHooks(hookDef);

  // hooks/hooks.json の生成
  // $schema は指定されたときだけ先頭に出力する（エディタ補完・検証用。Claude Code は読み込み時に無視する）
  const hooksJsonContent: Record<string, unknown> = {};
  if (hookDef.schema) {
    hooksJsonContent.$schema = hookDef.schema;
  }
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

/**
 * フック定義を Claude Code の仕様に照らして検証する。
 * - 未知のイベント名: 警告（Claude Code 側の新イベントを先行利用できるよう生成は止めない）
 * - フックアクションが空のエントリ: エラー
 * - ツール系イベント以外での `if`: エラー
 * - SessionStart / Setup での `mcp_tool`: エラー（MCP 接続前に発火するため）
 * - PermissionRequest での `agent`: エラー（command / http 型のみ許可）
 * - command が参照するスクリプトが scripts に同梱されていない: エラー
 * - shell form でクォートされていない ${CLAUDE_PLUGIN_ROOT}: 警告（`claude plugin validate` と同じ指摘）
 */
export function validateHooks(
  hookDef: LoadedHookDefinition,
): GenerationValidationError[] {
  const errors: GenerationValidationError[] = [];
  const knownEvents = new Set<string>(HOOK_EVENTS);
  const ifAllowedEvents = new Set<string>(HOOK_IF_ALLOWED_EVENTS);
  const mcpToolDisallowedEvents = new Set<string>(
    HOOK_MCP_TOOL_DISALLOWED_EVENTS,
  );
  const agentDisallowedEvents = new Set<string>(HOOK_AGENT_DISALLOWED_EVENTS);
  const bundledScripts = new Set(
    (hookDef.scripts ?? []).map((script) => script.filename),
  );

  for (const [event, entries] of Object.entries(hookDef.hooks)) {
    if (!entries) continue;

    if (!knownEvents.has(event)) {
      errors.push({
        severity: "warning",
        code: ERROR_CODES.HOOK_UNKNOWN_EVENT,
        message: `Unknown hook event "${event}". Check the event name spelling against the Claude Code hooks reference`,
        field: `hooks.${event}`,
      });
    }

    entries.forEach((entry, entryIndex) => {
      const entryField = `hooks.${event}[${entryIndex}]`;

      if (entry.hooks.length === 0) {
        errors.push({
          severity: "error",
          code: ERROR_CODES.HOOK_EMPTY_ENTRY,
          message: `Hook entry ${entryField} has no hook actions`,
          field: entryField,
        });
      }

      entry.hooks.forEach((action, actionIndex) => {
        const actionField = `${entryField}.hooks[${actionIndex}]`;
        errors.push(
          ...validateHookAction(action, {
            event,
            field: actionField,
            ifAllowedEvents,
            mcpToolDisallowedEvents,
            agentDisallowedEvents,
            bundledScripts,
          }),
        );
      });
    });
  }

  return errors;
}

interface ActionValidationContext {
  event: string;
  field: string;
  ifAllowedEvents: Set<string>;
  mcpToolDisallowedEvents: Set<string>;
  agentDisallowedEvents: Set<string>;
  bundledScripts: Set<string>;
}

// 単一のフックアクションを検証する
function validateHookAction(
  action: HookAction,
  ctx: ActionValidationContext,
): GenerationValidationError[] {
  const errors: GenerationValidationError[] = [];

  if (action.if !== undefined && !ctx.ifAllowedEvents.has(ctx.event)) {
    errors.push({
      severity: "error",
      code: ERROR_CODES.HOOK_IF_NOT_ALLOWED,
      message: `"if" is only supported on tool events (${HOOK_IF_ALLOWED_EVENTS.join(", ")}), not on ${ctx.event}`,
      field: `${ctx.field}.if`,
    });
  }

  if (
    action.type === HOOK_TYPES.MCP_TOOL &&
    ctx.mcpToolDisallowedEvents.has(ctx.event)
  ) {
    errors.push({
      severity: "error",
      code: ERROR_CODES.HOOK_MCP_TOOL_NOT_ALLOWED,
      message: `"mcp_tool" hooks cannot run on ${ctx.event} because MCP servers are not connected yet`,
      field: `${ctx.field}.type`,
    });
  }

  if (
    action.type === HOOK_TYPES.AGENT &&
    ctx.agentDisallowedEvents.has(ctx.event)
  ) {
    errors.push({
      severity: "error",
      code: ERROR_CODES.HOOK_AGENT_NOT_ALLOWED,
      message: `"agent" hooks cannot run on ${ctx.event}. Use "command" or "http" instead`,
      field: `${ctx.field}.type`,
    });
  }

  if (action.type === HOOK_TYPES.COMMAND) {
    // ${CLAUDE_PLUGIN_ROOT}/scripts/ 配下の参照は scripts に同梱されている必要がある
    const referencedScripts = new Set<string>();
    for (const text of [action.command, ...(action.args ?? [])]) {
      for (const match of text.matchAll(SCRIPT_REF_PATTERN)) {
        referencedScripts.add(match[1]);
      }
    }
    for (const scriptName of referencedScripts) {
      if (!ctx.bundledScripts.has(scriptName)) {
        errors.push({
          severity: "error",
          code: ERROR_CODES.HOOK_MISSING_SCRIPT,
          message: `Script "${scriptName}" referenced by command is not bundled in hooks.scripts`,
          field: `${ctx.field}.command`,
        });
      }
    }

    // shell form（args なし）ではシェルがパスを分割するため、${CLAUDE_PLUGIN_ROOT} はクォートが必要
    if (
      action.args === undefined &&
      UNQUOTED_PLUGIN_ROOT_PATTERN.test(action.command)
    ) {
      errors.push({
        severity: "warning",
        code: ERROR_CODES.HOOK_UNQUOTED_PLUGIN_ROOT,
        message: `\${CLAUDE_PLUGIN_ROOT} should be quoted (e.g. "\${CLAUDE_PLUGIN_ROOT}"/scripts/run.sh) so paths with spaces work`,
        field: `${ctx.field}.command`,
      });
    }
  }

  return errors;
}
