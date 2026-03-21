import type { getPlugin } from "../lib/plugins.server";

type Plugin = NonNullable<Awaited<ReturnType<typeof getPlugin>>>;

interface PluginInfoSectionProps {
  plugin: Plugin;
  onComponentClick: (componentId: string) => void;
  onTeamClick: (teamId: string) => void;
}

export default function PluginInfoSection({
  plugin,
  onComponentClick,
  onTeamClick,
}: PluginInfoSectionProps) {
  const skills = plugin.components.filter((c) => c.type === "SKILL");
  const agents = plugin.components.filter((c) => c.type === "AGENT");

  return (
    <>
      <div className="component-list">
        <h3>Skills ({skills.length})</h3>
        {skills.length === 0 ? (
          <p className="card-description">No skills yet.</p>
        ) : (
          skills.map((component) => (
            <div
              key={component.id}
              className="component-item component-item-link"
              style={{ cursor: "pointer" }}
              onClick={() => onComponentClick(component.id)}
            >
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
        <h3>Agents ({agents.length})</h3>
        {agents.length === 0 ? (
          <p className="card-description">No agents yet.</p>
        ) : (
          agents.map((component) => (
            <div
              key={component.id}
              className="component-item component-item-link"
              style={{ cursor: "pointer" }}
              onClick={() => onComponentClick(component.id)}
            >
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

      <div className="component-list">
        <h3>Agent Teams ({plugin.agentTeams.length})</h3>
        {plugin.agentTeams.length === 0 ? (
          <p className="card-description">No agent teams yet.</p>
        ) : (
          plugin.agentTeams.map((team) => (
            <div
              key={team.id}
              className="component-item component-item-link"
              style={{ cursor: "pointer" }}
              onClick={() => onTeamClick(team.id)}
            >
              <div>
                <span className="component-item-name">{team.name}</span>
                <span className="badge" style={{ marginLeft: "0.5rem" }}>
                  {team.orchestrator.skillConfig?.name ?? "(unnamed)"}
                </span>
              </div>
              <span className="badge">
                {team._count.members} member{team._count.members !== 1 ? "s" : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
