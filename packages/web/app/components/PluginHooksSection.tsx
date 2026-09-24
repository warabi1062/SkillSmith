// プラグインの hooks 定義（hooks/hooks.json に出力される内容）を read-only で表示するセクション

import type {
  HookAction,
  HookEntry,
  LoadedPluginDefinition,
} from "@warabi1062/skillsmith-core/types";

type LoadedHooks = NonNullable<LoadedPluginDefinition["hooks"]>;

interface PluginHooksSectionProps {
  hooks: LoadedHooks;
}

// アクション種別ごとの主要フィールドを1行の要約にする
function summarizeAction(action: HookAction): string {
  switch (action.type) {
    case "command":
      return action.args
        ? [action.command, ...action.args].join(" ")
        : action.command;
    case "http":
      return action.url;
    case "mcp_tool":
      return `${action.server} / ${action.tool}`;
    case "prompt":
    case "agent":
      return action.prompt;
  }
}

// timeout / if / async などの補足情報を「キー: 値」の配列にする
function collectMeta(action: HookAction): string[] {
  const meta: string[] = [];
  if (action.if) meta.push(`if: ${action.if}`);
  if (action.timeout !== undefined) meta.push(`timeout: ${action.timeout}s`);
  if (action.statusMessage) meta.push(`status: ${action.statusMessage}`);
  switch (action.type) {
    case "command":
      if (action.args) meta.push("exec form");
      if (action.async)
        meta.push(action.asyncRewake ? "async (rewake)" : "async");
      if (action.shell) meta.push(`shell: ${action.shell}`);
      break;
    case "http":
      if (action.allowedEnvVars?.length)
        meta.push(`env: ${action.allowedEnvVars.join(", ")}`);
      break;
    case "prompt":
    case "agent":
      if (action.model) meta.push(`model: ${action.model}`);
      break;
    case "mcp_tool":
      break;
  }
  return meta;
}

function HookActionItem({ action }: { action: HookAction }) {
  const meta = collectMeta(action);
  return (
    <li className="flex flex-col gap-1 py-2 border-t border-outline-variant first:border-t-0">
      <div className="flex items-start gap-2.5">
        <span className="inline-block shrink-0 px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold rounded-full leading-relaxed tracking-wider uppercase bg-secondary-container text-on-secondary-container">
          {action.type}
        </span>
        <code className="font-mono text-xs text-on-surface break-all whitespace-pre-wrap">
          {summarizeAction(action)}
        </code>
      </div>
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 pl-1 font-mono text-[0.6875rem] text-on-surface-variant">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
    </li>
  );
}

function HookEntryItem({ entry }: { entry: HookEntry }) {
  return (
    <div className="bg-surface-container-lowest rounded-md p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[0.6875rem] text-on-surface-variant uppercase tracking-wider">
          matcher
        </span>
        <code className="font-mono text-xs text-on-surface">
          {entry.matcher ? entry.matcher : "*"}
        </code>
      </div>
      <ul className="list-none m-0 p-0">
        {entry.hooks.map((action, i) => (
          <HookActionItem key={i} action={action} />
        ))}
      </ul>
    </div>
  );
}

export default function PluginHooksSection({ hooks }: PluginHooksSectionProps) {
  const events = Object.entries(hooks.hooks).filter(
    (pair): pair is [string, HookEntry[]] => Array.isArray(pair[1]),
  );

  return (
    <div className="mt-6 flex flex-col min-h-0">
      <div className="font-display text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-3 pb-2 border-b border-outline-variant">
        Hooks
      </div>
      {hooks.description && (
        <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
          {hooks.description}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {events.map(([event, entries]) => (
          <div key={event} className="bg-surface-container-low rounded-md p-5">
            <div className="font-mono text-sm font-semibold text-on-surface tracking-tight mb-3">
              {event}
            </div>
            <div className="flex flex-col gap-2">
              {entries.map((entry, i) => (
                <HookEntryItem key={i} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {hooks.scripts && hooks.scripts.length > 0 && (
        <div className="mt-3 text-xs text-on-surface-variant">
          <span className="uppercase tracking-wider">scripts</span>{" "}
          {hooks.scripts.map((s) => (
            <code
              key={s.filename}
              className="font-mono text-xs text-on-surface ml-2"
            >
              scripts/{s.filename}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}
