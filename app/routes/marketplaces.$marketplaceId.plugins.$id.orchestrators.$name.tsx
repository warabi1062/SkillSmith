import { useOutletContext, useParams } from "react-router";
import type { Route } from "./+types/marketplaces.$marketplaceId.plugins.$id.orchestrators.$name";
import type { PluginOutletContext } from "./marketplaces.$marketplaceId.plugins.$id";
import { buildSkillDetailData, SkillDetail } from "../components/orchestrator";
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
  breadcrumb: ({ params }: { params: Record<string, string | undefined> }) => ({
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

  const detailData = buildSkillDetailData(orchestrator);

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <div className="py-6">
        <div className="border border-border-subtle rounded-lg bg-bg-surface p-6">
          <h4 className="font-display text-[1.375rem] font-bold text-text-primary mb-2 tracking-tight">
            {orchestrator.name}
          </h4>
          {orchestrator.description && (
            <p className="text-[0.9rem] text-text-secondary mb-6 leading-relaxed">
              {orchestrator.description}
            </p>
          )}
          <SkillDetail data={detailData} allSkills={plugin.skills} />
        </div>
      </div>
    </div>
  );
}
