import { Form, Link, redirect, data } from "react-router";
import { getPlugin, createAgentTeam } from "../lib/plugins.server";
import { validateAgentTeamData, ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.agent-teams.new";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "New Agent Team - SkillSmith" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }

  const entryPointSkills = plugin.components.filter(
    (c) => c.type === "SKILL" && c.skillConfig?.skillType === "ENTRY_POINT",
  );

  return { plugin, entryPointSkills };
}

export async function action({ request, params }: Route.ActionArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const orchestratorId = String(formData.get("orchestratorId") ?? "");

  try {
    if (!orchestratorId) {
      throw new ValidationError({
        field: "orchestratorId",
        code: "ORCHESTRATOR_REQUIRED",
        message: "Orchestrator is required",
      });
    }

    validateAgentTeamData({
      name,
      description: description || undefined,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        {
          errors: { [error.field]: error.message },
          values: { name, description, orchestratorId },
        },
        { status: 400 },
      );
    }
    throw error;
  }

  try {
    const team = await createAgentTeam(params.id, {
      orchestratorId,
      name,
      description: description || undefined,
    });

    return redirect(`/plugins/${params.id}/agent-teams/${team.id}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        {
          errors: { [error.field]: error.message },
          values: { name, description, orchestratorId },
        },
        { status: 400 },
      );
    }
    throw error;
  }
}

export default function NewAgentTeam({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { plugin, entryPointSkills } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <div>
      <h2>New Agent Team</h2>
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
            defaultValue={values?.name ?? ""}
            required
          />
          {errors?.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            defaultValue={values?.description ?? ""}
          />
          {errors?.description && (
            <div className="form-error">{errors.description}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="orchestratorId">Orchestrator (Entry Point Skill)</label>
          <select
            id="orchestratorId"
            name="orchestratorId"
            defaultValue={values?.orchestratorId ?? ""}
            className="form-select"
            required
          >
            <option value="">-- Select --</option>
            {entryPointSkills.map((c) => (
              <option key={c.id} value={c.id}>
                {c.skillConfig?.name ?? "(unnamed)"}
              </option>
            ))}
          </select>
          {errors?.orchestratorId && (
            <div className="form-error">{errors.orchestratorId}</div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Create Agent Team
          </button>
          <Link to={`/plugins/${plugin.id}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
