import { data } from "react-router";
import { loadPluginDefinition } from "../lib/types/loader.server";
import type { Route } from "./+types/marketplaces.$marketplaceId.plugins.$id.orchestrators.$name";
import { OrchestratorView } from "../components/OrchestratorStructureView";
import * as path from "node:path";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.orchestratorName ?? "Orchestrator";
  const pluginName = loaderData?.plugin?.name ?? "Plugin";
  return [{ title: `${name} - ${pluginName} - SkillSmith` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const dirPath = path.join(
    process.cwd(),
    "marketplaces",
    params.marketplaceId,
    "plugins",
    params.id,
  );

  try {
    const plugin = await loadPluginDefinition(dirPath);
    const orchestrator = plugin.skills.find(
      (s) => s.skillType === "ENTRY_POINT" && s.name === params.name,
    );
    if (!orchestrator) {
      throw new Error("Orchestrator not found");
    }
    return { plugin, orchestratorName: params.name };
  } catch {
    throw data("Orchestrator not found", { status: 404 });
  }
}

// ブレッドクラム: オーケストレーター名を表示
export const handle = {
  breadcrumb: ({
    data: loaderData,
  }: { data: { orchestratorName: string } }) => ({
    label: loaderData.orchestratorName,
  }),
};

export default function OrchestratorDetail({
  loaderData,
}: Route.ComponentProps) {
  const { plugin, orchestratorName } = loaderData;
  const orchestrator = plugin.skills.find(
    (s) => s.skillType === "ENTRY_POINT" && s.name === orchestratorName,
  );

  if (!orchestrator) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <OrchestratorView skill={orchestrator} allSkills={plugin.skills} />
    </div>
  );
}
