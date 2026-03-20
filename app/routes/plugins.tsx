import { Link } from "react-router";
import { getPlugins } from "../lib/plugins.server";
import type { Route } from "./+types/plugins";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Plugins - SkillSmith" }];
}

export async function loader(_args: Route.LoaderArgs) {
  const plugins = await getPlugins();
  return { plugins };
}

export default function Plugins({ loaderData }: Route.ComponentProps) {
  const { plugins } = loaderData;

  return (
    <div>
      <div className="detail-header">
        <h2>Plugins</h2>
        <Link to="/plugins/new" className="btn btn-primary">
          New Plugin
        </Link>
      </div>

      {plugins.length === 0 ? (
        <div className="empty-state">
          <p>No plugins yet.</p>
          <Link to="/plugins/new" className="btn btn-primary">
            Create your first plugin
          </Link>
        </div>
      ) : (
        <div>
          {plugins.map((plugin) => (
            <Link
              key={plugin.id}
              to={`/plugins/${plugin.id}`}
              className="card"
              style={{ display: "block" }}
            >
              <div className="card-title">{plugin.name}</div>
              {plugin.description && (
                <div className="card-description">{plugin.description}</div>
              )}
              <div
                className="card-description"
                style={{ marginTop: "0.5rem" }}
              >
                {plugin._count.components} component
                {plugin._count.components !== 1 ? "s" : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
