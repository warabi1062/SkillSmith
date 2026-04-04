import { useOutletContext, useParams } from "react-router";
import type { Route } from "./+types/marketplaces.$marketplaceId.plugins.$id.skills.$name";
import type { PluginOutletContext } from "./marketplaces.$marketplaceId.plugins.$id";
import {
  buildSkillDetailData,
  SkillDetail,
} from "../components/orchestrator";
import { getSkillTypeBadge } from "../lib/utils/skill-type";
import { SKILL_TYPES } from "../lib/types/constants";

export function meta({ matches, params }: Route.MetaArgs) {
  const parentData = matches.find(
    (m) => m?.id === "routes/marketplaces.$marketplaceId.plugins.$id",
  )?.data as { plugin: { name: string } } | undefined;
  const pluginName = parentData?.plugin?.name ?? "Plugin";
  const name = params.name ?? "Skill";
  return [{ title: `${name} - ${pluginName} - SkillSmith` }];
}

// ブレッドクラム: スキル名を表示
export const handle = {
  breadcrumb: ({
    params,
  }: { params: Record<string, string | undefined> }) => ({
    label: params.name ?? "",
  }),
};

export default function SkillDetailPage() {
  const { plugin } = useOutletContext<PluginOutletContext>();
  const { name: skillName } = useParams();
  const skill = plugin.skills.find(
    (s) => s.skillType !== SKILL_TYPES.ENTRY_POINT && s.name === skillName,
  );

  if (!skill) {
    return null;
  }

  const detailData = buildSkillDetailData(skill);

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <div className="py-6">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="font-display text-[1.375rem] font-bold text-text-primary tracking-tight">
            {skill.name}
          </h4>
          <span className="inline-block px-2 py-px font-mono text-[0.625rem] font-semibold rounded-sm leading-relaxed tracking-wider uppercase bg-bg-hover text-text-secondary border border-border-default">
            {getSkillTypeBadge(skill.skillType)}
          </span>
        </div>
        {skill.description && (
          <p className="text-[0.9rem] text-text-secondary mb-6 leading-relaxed">
            {skill.description}
          </p>
        )}
        <div className="border border-border-subtle rounded-md bg-bg-surface p-6">
          <SkillDetail data={detailData} />
        </div>
      </div>
    </div>
  );
}
