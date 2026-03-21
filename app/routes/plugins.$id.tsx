import { useState } from "react";
import { Link, data } from "react-router";
import { getPlugin } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id";
import PluginGraphSection from "../components/PluginGraphSection";
import PluginActionsSection from "../components/PluginActionsSection";

export { action } from "./plugins.$id.action.server";

interface ModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  componentType?: "SKILL" | "AGENT";
  componentId?: string;
}

interface MembersModalState {
  isOpen: boolean;
  teamId?: string;
}

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

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: "create",
  });
  const [membersModalState, setMembersModalState] = useState<MembersModalState>({
    isOpen: false,
  });

  return (
    <div>
      <PluginActionsSection plugin={plugin} />

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
              onClick={() => setModalState({ isOpen: true, mode: "edit", componentId: component.id })}
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
              onClick={() => setModalState({ isOpen: true, mode: "edit", componentId: component.id })}
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
              onClick={() => setMembersModalState({ isOpen: true, teamId: team.id })}
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

      <PluginGraphSection
        plugin={plugin}
        modalState={modalState}
        onModalStateChange={setModalState}
        membersModalState={membersModalState}
        onMembersModalStateChange={setMembersModalState}
      />

      <div style={{ marginTop: "2rem" }}>
        <Link to="/plugins" className="btn btn-secondary">
          Back to Plugins
        </Link>
      </div>
    </div>
  );
}
