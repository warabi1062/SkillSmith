import { data } from "react-router";
import { loadPluginDefinition } from "../lib/types/loader.server";
import type { Route } from "./+types/plugins.$id";
import OrchestratorStructureView from "../components/OrchestratorStructureView";
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
    return { plugin };
  } catch {
    throw data("Plugin not found", { status: 404 });
  }
}

export default function PluginDetail({ loaderData }: Route.ComponentProps) {
  const { plugin } = loaderData;

  return (
    <div className="plugin-detail-page">
      <PluginActionsSection
        plugin={{ name: plugin.name, description: plugin.description ?? null }}
      />

      <OrchestratorStructureView plugin={plugin} />
    </div>
  );
}
