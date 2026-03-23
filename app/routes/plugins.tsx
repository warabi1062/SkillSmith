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
    <div>
      <div className="detail-header">
        <h2>Plugins</h2>
      </div>

      {plugins.length === 0 ? (
        <div className="empty-state">
          <p>No plugins yet.</p>
        </div>
      ) : (
        <div>
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
              <div
                className="card-description"
                style={{ marginTop: "0.5rem" }}
              >
                {plugin.skillCount} skill
                {plugin.skillCount !== 1 ? "s" : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
