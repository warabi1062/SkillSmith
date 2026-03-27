import { Link } from "react-router";
import { loadAllPluginMeta } from "../lib/types/loader.server";
import type { Route } from "./+types/plugins";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Plugins - SkillSmith" }];
}

export async function loader(_args: Route.LoaderArgs) {
  const plugins = await loadAllPluginMeta();
  return { plugins };
}

export default function Plugins({ loaderData }: Route.ComponentProps) {
  const { plugins } = loaderData;

  return (
    <div className="plugins-page">
      <div className="plugins-page-header">
        <h2>Plugins</h2>
        <span className="plugins-page-count">
          {plugins.length} plugin{plugins.length !== 1 ? "s" : ""}
        </span>
      </div>

      {plugins.length === 0 ? (
        <div className="empty-state">
          <p>No plugins yet.</p>
        </div>
      ) : (
        <div className="plugins-grid">
          {plugins.map((plugin) => (
            <Link
              key={plugin.dirName}
              to={`/plugins/${plugin.dirName}`}
              className="card"
              style={{ display: "block" }}
            >
              <div className="card-title">{plugin.name}</div>
              {plugin.description && (
                <div className="card-description">{plugin.description}</div>
              )}
              <div className="plugin-card-meta">
                <span className="plugin-card-stat">
                  <span className="plugin-card-stat-icon">S</span>
                  {plugin.skillCount} skill
                  {plugin.skillCount !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
