import { data } from "react-router";
import { loadPluginDefinition } from "../lib/types/loader.server";
import type { Route } from "./+types/marketplaces.$marketplaceId.plugins.$id.skills.$name";
import {
  buildSkillDetailData,
  SkillDetail,
} from "../components/OrchestratorStructureView";
import * as path from "node:path";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.skillName ?? "Skill";
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
    const skill = plugin.skills.find(
      (s) => s.skillType !== "ENTRY_POINT" && s.name === params.name,
    );
    if (!skill) {
      throw new Error("Skill not found");
    }
    return { plugin, skillName: params.name };
  } catch {
    throw data("Skill not found", { status: 404 });
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

// ブレッドクラム: スキル名を表示
export const handle = {
  breadcrumb: ({ data: loaderData }: { data: { skillName: string } }) => ({
    label: loaderData.skillName,
  }),
};

export default function SkillDetailPage({ loaderData }: Route.ComponentProps) {
  const { plugin, skillName } = loaderData;
  const skill = plugin.skills.find(
    (s) => s.skillType !== "ENTRY_POINT" && s.name === skillName,
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
