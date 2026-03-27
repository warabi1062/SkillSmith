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

export default function PluginDetail({ loaderData }: Route.ComponentProps) {
  const { plugin, pluginId } = loaderData;
  const orchestrators = plugin.skills.filter(s => s.skillType === "ENTRY_POINT");

  return (
    <div className="plugin-detail-page">
      <PluginActionsSection
        plugin={{ name: plugin.name, description: plugin.description ?? null }}
      />

      {orchestrators.length > 0 && (
        <div className="ov-container">
          <div className="orchestrator-list-header">
            Orchestrators
          </div>
          {orchestrators.map(orch => (
            <Link
              key={orch.name}
              to={`/plugins/${pluginId}/orchestrators/${orch.name}`}
              className="card"
              style={{ display: "block" }}
            >
              <div className="card-title">{orch.name}</div>
              {orch.description && (
                <div className="card-description">{orch.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
