import { useOutletContext, useParams } from "react-router";
import type { PluginOutletContext } from "./marketplaces.$marketplaceId.plugins.$id";
import { buildSkillDetailData, SkillDetail } from "../components/orchestrator";
import { SKILL_TYPES } from "@warabi1062/skillsmith-core/types/constants";

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
        <div className="bg-surface-container-lowest rounded-lg shadow-level1 p-6">
          <h4 className="font-display text-xl font-bold text-on-surface mb-2 tracking-tight">
            {orchestrator.name}
          </h4>
          <SkillDetail data={detailData} allSkills={plugin.skills} depth={0} />
        </div>
      </div>
    </div>
  );
}
