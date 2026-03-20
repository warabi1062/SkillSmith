import { Link, Form, data } from "react-router";
import { getPlugin } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.plugin?.name ?? "Plugin";
  return [{ title: `${name} - SkillSmith` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }
  return { plugin };
}

export default function PluginDetail({ loaderData }: Route.ComponentProps) {
  const { plugin } = loaderData;

  const skills = plugin.components.filter((c) => c.type === "SKILL");
  const agents = plugin.components.filter((c) => c.type === "AGENT");

  return (
    <div>
      <div className="detail-header">
        <div>
          <h2>{plugin.name}</h2>
          {plugin.description && (
            <p className="card-description">{plugin.description}</p>
          )}
        </div>
        <div className="detail-actions">
          <Link to={`/plugins/${plugin.id}/edit`} className="btn btn-secondary">
            Edit
          </Link>
          <Form
            method="post"
            action={`/plugins/${plugin.id}/destroy`}
            onSubmit={(event) => {
              const confirmed = window.confirm(
                `Plugin "${plugin.name}" and all its components will be deleted. Are you sure?`,
              );
              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <button type="submit" className="btn btn-danger">
              Delete
            </button>
          </Form>
        </div>
      </div>

      <div className="component-list">
        <h3>
          Skills ({skills.length})
        </h3>
        {skills.length === 0 ? (
          <p className="card-description">No skills yet.</p>
        ) : (
          skills.map((component) => (
            <div key={component.id} className="component-item">
              <div>
                <span className="component-item-name">
                  {component.skillConfig?.name ?? "(unnamed)"}
                </span>
                {component.skillConfig?.skillType && (
                  <span
                    className="badge"
                    style={{ marginLeft: "0.5rem" }}
                  >
                    {component.skillConfig.skillType}
                  </span>
                )}
              </div>
              <span className="badge badge-skill">SKILL</span>
            </div>
          ))
        )}
      </div>

      <div className="component-list">
        <h3>
          Agents ({agents.length})
        </h3>
        {agents.length === 0 ? (
          <p className="card-description">No agents yet.</p>
        ) : (
          agents.map((component) => (
            <div key={component.id} className="component-item">
              <div>
                <span className="component-item-name">
                  {component.agentConfig?.name ?? "(unnamed)"}
                </span>
              </div>
              <span className="badge badge-agent">AGENT</span>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link to="/plugins" className="btn btn-secondary">
          Back to Plugins
        </Link>
      </div>
    </div>
  );
}
