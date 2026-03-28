import { data, Link } from "react-router";
import { loadPluginDefinition } from "../lib/types/loader.server";
import type { Route } from "./+types/plugins.$id.orchestrators.$name";
import { OrchestratorView } from "../components/OrchestratorStructureView";
import * as path from "node:path";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.orchestratorName ?? "Orchestrator";
  const pluginName = loaderData?.plugin?.name ?? "Plugin";
  return [{ title: `${name} - ${pluginName} - SkillSmith` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const pluginsDir = path.join(process.cwd(), "plugins");
  const dirPath = path.join(pluginsDir, params.id);

  try {
    const plugin = await loadPluginDefinition(dirPath);
    const orchestrator = plugin.skills.find(
      s => s.skillType === "ENTRY_POINT" && s.name === params.name
    );
    if (!orchestrator) {
      throw new Error("Orchestrator not found");
    }
    return { plugin, pluginId: params.id, orchestratorName: params.name };
  } catch {
    throw data("Orchestrator not found", { status: 404 });
  }
}

export default function OrchestratorDetail({ loaderData }: Route.ComponentProps) {
  const { plugin, pluginId, orchestratorName } = loaderData;
  const orchestrator = plugin.skills.find(
    s => s.skillType === "ENTRY_POINT" && s.name === orchestratorName
  );

  if (!orchestrator) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 relative animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-start mb-6">
        <Link to={`/plugins/${pluginId}`} className="font-heading text-[0.8125rem] font-medium text-muted-foreground inline-flex items-center gap-1 py-1 transition-colors hover:text-accent-foreground">
          &larr; {plugin.name}
        </Link>
      </div>

      <OrchestratorView skill={orchestrator} allSkills={plugin.skills} />
    </div>
  );
}
