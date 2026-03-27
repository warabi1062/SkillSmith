import { Link } from "react-router";
import type { Route } from "./+types/plugins.$id";
import { OrchestratorView } from "../components/OrchestratorStructureView";

export default function OrchestratorDetail({ loaderData, params }: Route.ComponentProps) {
  const { plugin, pluginId } = loaderData;
  const orchestratorName = (params as Record<string, string>).name;
  const orchestrator = plugin.skills.find(
    s => s.skillType === "ENTRY_POINT" && s.name === orchestratorName
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
