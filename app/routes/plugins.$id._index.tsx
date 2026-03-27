import { Link, useRouteLoaderData } from "react-router";
import type { Route as ParentRoute } from "./+types/plugins.$id";
import PluginActionsSection from "../components/PluginActionsSection";

export default function PluginDetail() {
  const { plugin, pluginId } = useRouteLoaderData("routes/plugins.$id") as ParentRoute.ComponentProps["loaderData"];
  const orchestrators = plugin.skills.filter(s => s.skillType === "ENTRY_POINT");

  return (
    <div className="plugin-detail-page">
      <PluginActionsSection
        plugin={{ name: plugin.name, description: plugin.description ?? null }}
      />

      {orchestrators.length > 0 && (
        <div className="ov-container">
          <h3>Orchestrators</h3>
          {orchestrators.map(orch => (
            <Link
              key={orch.name}
              to={`/plugins/${pluginId}/orchestrators/${orch.name}`}
              className="card"
              style={{ display: "block" }}
            >
              <div className="card-title">{orch.name}</div>
              {orch.description && (
                <div className="card-description">{orch.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
