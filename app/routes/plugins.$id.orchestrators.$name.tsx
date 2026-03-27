import { data, Link, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/plugins.$id.orchestrators.$name";
import type { Route as ParentRoute } from "./+types/plugins.$id";
import { OrchestratorView } from "../components/OrchestratorStructureView";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `${params.name} - SkillSmith` }];
}

export default function OrchestratorDetail({ params }: Route.ComponentProps) {
  const { plugin, pluginId } = useRouteLoaderData("routes/plugins.$id") as ParentRoute.ComponentProps["loaderData"];
  const orchestrator = plugin.skills.find(
    s => s.skillType === "ENTRY_POINT" && s.name === params.name
  );

  if (!orchestrator) {
    return (
      <div className="plugin-detail-page">
        <div className="detail-header">
          <Link to={`/plugins/${pluginId}`} className="back-link">
            &larr; {plugin.name}
          </Link>
        </div>
        <p>Orchestrator not found</p>
      </div>
    );
  }

  return (
    <div className="plugin-detail-page">
      <div className="detail-header">
        <Link to={`/plugins/${pluginId}`} className="back-link">
          &larr; {plugin.name}
        </Link>
      </div>

      <OrchestratorView skill={orchestrator} allSkills={plugin.skills} />
    </div>
  );
}
