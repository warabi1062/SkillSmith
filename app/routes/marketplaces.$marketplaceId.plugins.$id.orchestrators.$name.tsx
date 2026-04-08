import { useOutletContext, useParams } from "react-router";
import type { Route } from "./+types/marketplaces.$marketplaceId.plugins.$id.orchestrators.$name";
import type { PluginOutletContext } from "./marketplaces.$marketplaceId.plugins.$id";
import { OrchestratorView } from "../components/orchestrator";
import { SKILL_TYPES } from "../lib/types/constants";

export function meta({ matches, params }: Route.MetaArgs) {
  const parentData = matches.find(
    (m) => m?.id === "routes/marketplaces.$marketplaceId.plugins.$id",
  )?.data as { plugin: { name: string } } | undefined;
  const pluginName = parentData?.plugin?.name ?? "Plugin";
  const name = params.name ?? "Orchestrator";
  return [{ title: `${name} - ${pluginName} - SkillSmith` }];
}

// ブレッドクラム: オーケストレーター名を表示
export const handle = {
  breadcrumb: ({
    params,
  }: { params: Record<string, string | undefined> }) => ({
    label: params.name ?? "",
    to: `/marketplaces/${params.marketplaceId}/plugins/${params.id}/orchestrators/${params.name}`,
  }),
};

export default function OrchestratorDetail() {
  const { plugin } = useOutletContext<PluginOutletContext>();
  const { name } = useParams();
  const orchestrator = plugin.skills.find(
    (s) => s.skillType === SKILL_TYPES.ENTRY_POINT && s.name === name,
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
