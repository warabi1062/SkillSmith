import { Link, useOutletContext } from "react-router";
import type { Route } from "./+types/marketplaces.$marketplaceId.plugins.$id._index";
import type { PluginOutletContext } from "./marketplaces.$marketplaceId.plugins.$id";
import PluginActionsSection from "../components/PluginActionsSection";
import { getSkillTypeBadge } from "../lib/utils/skill-type";
import { SKILL_TYPES } from "../lib/types/constants";

export function meta({ matches }: Route.MetaArgs) {
  const parentData = matches.find(
    (m) => m?.id === "routes/marketplaces.$marketplaceId.plugins.$id",
  )?.data as { plugin: { name: string } } | undefined;
  const name = parentData?.plugin?.name ?? "Plugin";
  return [{ title: `${name} - SkillSmith` }];
}

export default function PluginDetail() {
  const { plugin, pluginId, marketplaceId } =
    useOutletContext<PluginOutletContext>();
  const orchestrators = plugin.skills.filter(
    (s) => s.skillType === SKILL_TYPES.ENTRY_POINT,
  );
  const workers = plugin.skills.filter(
    (s) => s.skillType !== SKILL_TYPES.ENTRY_POINT,
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <PluginActionsSection
        plugin={{ name: plugin.name, description: plugin.description ?? null }}
      />

      {orchestrators.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto ov-scrollbar">
          <div className="font-display text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-3 pb-2 border-b border-outline-variant">
            Orchestrators
          </div>
          <div className="flex flex-col gap-3">
            {orchestrators.map((orch) => (
              <Link
                key={orch.name}
                to={`/marketplaces/${marketplaceId}/plugins/${pluginId}/orchestrators/${orch.name}`}
                className="block bg-surface-container-low rounded-md p-5 no-underline hover:no-underline hover:shadow-level1 hover:bg-surface-container"
              >
                <div className="font-display text-base font-semibold text-on-surface tracking-tight mb-1">
                  {orch.name}
                </div>
                {orch.description && (
                  <div className="text-sm text-on-surface-variant leading-relaxed">
                    {orch.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {workers.length > 0 && (
        <div className="mt-6 flex-1 flex flex-col min-h-0 overflow-y-auto ov-scrollbar">
          <div className="font-display text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-3 pb-2 border-b border-outline-variant">
            Skills
          </div>
          <div className="flex flex-col gap-3">
            {workers.map((worker) => (
              <Link
                key={worker.name}
                to={`/marketplaces/${marketplaceId}/plugins/${pluginId}/skills/${worker.name}`}
                className="block bg-surface-container-low rounded-md p-5 no-underline hover:no-underline hover:shadow-level1 hover:bg-surface-container"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="font-display text-base font-semibold text-on-surface tracking-tight">
                    {worker.name}
                  </div>
                  <span className="inline-block px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold rounded-full leading-relaxed tracking-wider uppercase bg-secondary-container text-on-secondary-container">
                    {getSkillTypeBadge(worker.skillType)}
                  </span>
                </div>
                {worker.description && (
                  <div className="text-sm text-on-surface-variant leading-relaxed">
                    {worker.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
