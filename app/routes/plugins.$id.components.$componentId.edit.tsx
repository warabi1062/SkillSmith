import { Form, Link, redirect, data } from "react-router";
import { getPlugin, getComponent, updateComponent } from "../lib/plugins.server";
import { validateComponentData, ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.components.$componentId.edit";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit Component - SkillSmith" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }

  const component = await getComponent(params.componentId);
  if (!component || component.pluginId !== params.id) {
    throw data("Component not found", { status: 404 });
  }

  return { plugin, component };
}

export async function action({ request, params }: Route.ActionArgs) {
  const component = await getComponent(params.componentId);
  if (!component || component.pluginId !== params.id) {
    throw data("Component not found", { status: 404 });
  }

  const formData = await request.formData();
  const type = component.type;
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const skillType = String(formData.get("skillType") ?? "");

  try {
    validateComponentData({
      type,
      name,
      description: description || undefined,
      skillType: skillType || undefined,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        {
          errors: { [error.field]: error.message },
          values: { name, description, skillType },
        },
        { status: 400 },
      );
    }
    throw error;
  }

  await updateComponent(params.componentId, {
    type: type as "SKILL" | "AGENT",
    name,
    description: description || undefined,
    skillType: skillType as "ENTRY_POINT" | "WORKER" | undefined,
  });

  return redirect(
    `/plugins/${params.id}/components/${params.componentId}`,
  );
}

export default function EditComponent({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { plugin, component } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;

  const isSkill = component.type === "SKILL";
  const config = isSkill ? component.skillConfig : component.agentConfig;

  return (
    <div>
      <h2>Edit Component</h2>
      <p className="card-description" style={{ marginBottom: "1rem" }}>
        Plugin: {plugin.name} / Type:{" "}
        <span className={`badge ${isSkill ? "badge-skill" : "badge-agent"}`}>
          {component.type}
        </span>
      </p>
      <Form method="post" style={{ maxWidth: "480px" }}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={values?.name ?? config?.name ?? ""}
            required
          />
          {errors?.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="description">
            Description{!isSkill ? " (required)" : ""}
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={
              values?.description ?? config?.description ?? ""
            }
            required={!isSkill}
          />
          {errors?.description && (
            <div className="form-error">{errors.description}</div>
          )}
        </div>

        {isSkill && component.skillConfig && (
          <div className="form-group">
            <label htmlFor="skillType">Skill Type</label>
            <select
              id="skillType"
              name="skillType"
              defaultValue={
                values?.skillType ?? component.skillConfig.skillType ?? ""
              }
              className="form-select"
            >
              <option value="">-- Select --</option>
              <option value="ENTRY_POINT">Entry Point</option>
              <option value="WORKER">Worker</option>
            </select>
            {errors?.skillType && (
              <div className="form-error">{errors.skillType}</div>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
          <Link
            to={`/plugins/${plugin.id}/components/${component.id}`}
            className="btn btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
