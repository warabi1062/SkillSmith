import { Form, Link, redirect, data } from "react-router";
import { getPlugin, getAgentTeam, updateAgentTeam } from "../lib/plugins.server";
import { validateAgentTeamData, ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.agent-teams.$teamId.edit";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit Agent Team - SkillSmith" }];
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

export async function action({ request, params }: Route.ActionArgs) {
  const team = await getAgentTeam(params.teamId);
  if (!team || team.pluginId !== params.id) {
    throw data("Agent Team not found", { status: 404 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");

  try {
    validateAgentTeamData({
      name,
      description: description || undefined,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        {
          errors: { [error.field]: error.message },
          values: { name, description },
        },
        { status: 400 },
      );
    }
    throw error;
  }

  await updateAgentTeam(params.teamId, {
    name,
    description: description || undefined,
  });

  return redirect(
    `/plugins/${params.id}/agent-teams/${params.teamId}`,
  );
}

export default function EditAgentTeam({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { plugin, team } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <div>
      <h2>Edit Agent Team</h2>
      <p className="card-description" style={{ marginBottom: "1rem" }}>
        Plugin: {plugin.name}
      </p>
      <Form method="post" style={{ maxWidth: "480px" }}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={values?.name ?? team.name}
            required
          />
          {errors?.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            defaultValue={values?.description ?? team.description ?? ""}
          />
          {errors?.description && (
            <div className="form-error">{errors.description}</div>
          )}
        </div>

        <div className="form-group">
          <label>Orchestrator</label>
          <p className="card-description">
            {team.orchestrator.skillConfig?.name ?? "(unnamed)"} (not editable)
          </p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Save Changes
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
