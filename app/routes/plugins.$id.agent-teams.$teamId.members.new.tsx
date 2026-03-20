import { Form, Link, redirect, data } from "react-router";
import { getPlugin, getAgentTeam, addAgentTeamMember } from "../lib/plugins.server";
import { ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.agent-teams.$teamId.members.new";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Add Team Member - SkillSmith" }];
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

  const agentComponents = plugin.components.filter((c) => c.type === "AGENT");

  return { plugin, team, agentComponents };
}

export async function action({ request, params }: Route.ActionArgs) {
  const team = await getAgentTeam(params.teamId);
  if (!team || team.pluginId !== params.id) {
    throw data("Agent Team not found", { status: 404 });
  }

  const formData = await request.formData();
  const componentId = String(formData.get("componentId") ?? "");

  if (!componentId) {
    return data(
      {
        errors: { componentId: "Agent component is required" },
        values: { componentId },
      },
      { status: 400 },
    );
  }

  try {
    await addAgentTeamMember(params.teamId, { componentId });
    return redirect(
      `/plugins/${params.id}/agent-teams/${params.teamId}`,
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        {
          errors: { [error.field]: error.message },
          values: { componentId },
        },
        { status: 400 },
      );
    }
    throw error;
  }
}

export default function NewAgentTeamMember({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { plugin, team, agentComponents } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <div>
      <h2>Add Member to {team.name}</h2>
      <p className="card-description" style={{ marginBottom: "1rem" }}>
        Plugin: {plugin.name}
      </p>
      <Form method="post" style={{ maxWidth: "480px" }}>
        <div className="form-group">
          <label htmlFor="componentId">Agent</label>
          <select
            id="componentId"
            name="componentId"
            defaultValue={values?.componentId ?? ""}
            className="form-select"
            required
          >
            <option value="">-- Select an Agent --</option>
            {agentComponents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.agentConfig?.name ?? "(unnamed)"}
              </option>
            ))}
          </select>
          {errors?.componentId && (
            <div className="form-error">{errors.componentId}</div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Add Member
          </button>
          <Link
            to={`/plugins/${plugin.id}/agent-teams/${team.id}`}
            className="btn btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
