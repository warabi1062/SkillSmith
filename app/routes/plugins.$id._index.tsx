import { data, Link } from "react-router";
import { loadPluginDefinition } from "../lib/types/loader.server";
import type { Route } from "./+types/plugins.$id._index";
import PluginActionsSection from "../components/PluginActionsSection";
import * as path from "node:path";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.plugin?.name ?? "Plugin";
  return [{ title: `${name} - SkillSmith` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const pluginsDir = path.join(process.cwd(), "plugins");
  const dirPath = path.join(pluginsDir, params.id);

  try {
    const plugin = await loadPluginDefinition(dirPath);
    return { plugin, pluginId: params.id };
  } catch {
    throw data("Plugin not found", { status: 404 });
  }
}

// スキルタイプに対応するバッジ表示ラベルを返す
function getSkillTypeBadge(skillType: string): string {
  switch (skillType) {
    case "WORKER":
      return "WORKER";
    case "WORKER_WITH_SUB_AGENT":
      return "WORKER + SUB AGENT";
    case "WORKER_WITH_AGENT_TEAM":
      return "WORKER + AGENT TEAM";
    default:
      return skillType;
  }
}

export default function PluginDetail({ loaderData }: Route.ComponentProps) {
  const { plugin, pluginId } = loaderData;
  const orchestrators = plugin.skills.filter(
    (s) => s.skillType === "ENTRY_POINT",
  );
  const workers = plugin.skills.filter((s) => s.skillType !== "ENTRY_POINT");

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <PluginActionsSection
        plugin={{ name: plugin.name, description: plugin.description ?? null }}
      />

      {orchestrators.length > 0 && (
        <div className="mt-2 flex-1 flex flex-col min-h-0 overflow-y-auto ov-scrollbar">
          <div className="font-display text-xs font-semibold text-text-tertiary uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">
            Orchestrators
          </div>
          {orchestrators.map((orch) => (
            <Link
              key={orch.name}
              to={`/plugins/${pluginId}/orchestrators/${orch.name}`}
              className="block bg-bg-surface border border-border-subtle rounded-lg px-6 py-6 transition-all relative overflow-hidden hover:border-border-strong hover:bg-bg-elevated hover:-translate-y-0.5 hover:shadow-md mt-3 first:mt-0"
            >
              <div className="font-display text-base font-semibold text-text-primary tracking-tight mb-1">
                {orch.name}
              </div>
              {orch.description && (
                <div className="text-sm text-text-secondary leading-normal">
                  {orch.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {workers.length > 0 && (
        <div className="mt-6 flex-1 flex flex-col min-h-0 overflow-y-auto ov-scrollbar">
          <div className="font-display text-xs font-semibold text-text-tertiary uppercase tracking-widest mb-2 pb-1 border-b border-border-subtle">
            Skills
          </div>
          {workers.map((worker) => (
            <Link
              key={worker.name}
              to={`/plugins/${pluginId}/skills/${worker.name}`}
              className="block bg-bg-surface border border-border-subtle rounded-lg px-6 py-6 transition-all relative overflow-hidden hover:border-border-strong hover:bg-bg-elevated hover:-translate-y-0.5 hover:shadow-md mt-3 first:mt-0"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="font-display text-base font-semibold text-text-primary tracking-tight">
                  {worker.name}
                </div>
                <span className="inline-block px-2 py-px font-mono text-[0.625rem] font-semibold rounded-sm leading-relaxed tracking-wider uppercase bg-bg-hover text-text-secondary border border-border-default">
                  {getSkillTypeBadge(worker.skillType)}
                </span>
              </div>
              {worker.description && (
                <div className="text-sm text-text-secondary leading-normal">
                  {worker.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
