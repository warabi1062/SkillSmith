import { Link, Form, data } from "react-router";
import { getPlugin, getAgentTeam } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.agent-teams.$teamId";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.team?.name ?? "Agent Team";
  return [{ title: `${name} - SkillSmith` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }

  const team = await getAgentTeam(params.teamId);
  if (!team || team.pluginId !== params.id) {
    throw data("Agent Team not found", { status: 404 });
  }

  return { plugin, team };
}

export default function AgentTeamDetail({ loaderData }: Route.ComponentProps) {
  const { plugin, team } = loaderData;

  return (
    <div>
      <div className="detail-header">
        <div>
          <h2>{team.name}</h2>
          {team.description && (
            <p className="card-description">{team.description}</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>Orchestrator</h3>
        <dl className="config-list">
          <div className="config-item">
            <dt>Skill</dt>
            <dd>
              <Link
                to={`/plugins/${plugin.id}/components/${team.orchestrator.id}`}
              >
                {team.orchestrator.skillConfig?.name ?? "(unnamed)"}
              </Link>
            </dd>
          </div>
        </dl>
      </div>

      <div className="component-list" style={{ marginTop: "1rem" }}>
        <div className="component-list-header">
          <h3>Members ({team.members.length})</h3>
          <Link
            to={`/plugins/${plugin.id}/agent-teams/${team.id}/members/new`}
            className="btn btn-primary btn-sm"
          >
            Add Member
          </Link>
        </div>
        {team.members.length === 0 ? (
          <p className="card-description">No members yet.</p>
        ) : (
          team.members.map((member) => (
            <div key={member.id} className="component-item">
              <div>
                <Link
                  to={`/plugins/${plugin.id}/components/${member.component.id}`}
                  className="component-item-name"
                >
                  {member.component.agentConfig?.name ?? "(unnamed)"}
                </Link>
                <span className="badge badge-agent" style={{ marginLeft: "0.5rem" }}>
                  AGENT
                </span>
              </div>
              <Form
                method="post"
                action={`/plugins/${plugin.id}/agent-teams/${team.id}/members/${member.id}/destroy`}
                onSubmit={(event) => {
                  const confirmed = window.confirm(
                    `Remove "${member.component.agentConfig?.name ?? "(unnamed)"}" from the team?`,
                  );
                  if (!confirmed) {
                    event.preventDefault();
                  }
                }}
              >
                <button type="submit" className="btn btn-danger btn-sm">
                  Remove
                </button>
              </Form>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link to={`/plugins/${plugin.id}`} className="btn btn-secondary">
          Back to Plugin
        </Link>
      </div>
    </div>
  );
}
