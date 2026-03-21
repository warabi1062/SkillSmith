import { Form, Link, redirect, data } from "react-router";
import { useState } from "react";
import { getPlugin, createComponent } from "../lib/plugins.server";
import { validateComponentData, ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.components.new";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "New Component - SkillSmith" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }
  return { plugin };
}

export async function action({ request, params }: Route.ActionArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }

  const formData = await request.formData();
  const type = String(formData.get("type") ?? "");
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const skillType = String(formData.get("skillType") ?? "");

  try {
    validateComponentData({
      type,
      name,
      description,
      skillType: skillType || undefined,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        {
          errors: { [error.field]: error.message },
          values: { type, name, description, skillType },
        },
        { status: 400 },
      );
    }
    throw error;
  }

  const component = await createComponent(params.id, {
    type: type as "SKILL" | "AGENT",
    name,
    description: description || null,
    skillType: skillType as "ENTRY_POINT" | "WORKER" | undefined,
  });

  return redirect(`/plugins/${params.id}/components/${component.id}`);
}

export default function NewComponent({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { plugin } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;
  const [selectedType, setSelectedType] = useState(values?.type ?? "SKILL");

  return (
    <div>
      <h2>New Component</h2>
      <p className="card-description" style={{ marginBottom: "1rem" }}>
        Plugin: {plugin.name}
      </p>
      <Form method="post" style={{ maxWidth: "480px" }}>
        <div className="form-group">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            name="type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="form-select"
          >
            <option value="SKILL">Skill</option>
            <option value="AGENT">Agent</option>
          </select>
          {errors?.type && <div className="form-error">{errors.type}</div>}
        </div>

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
          <label htmlFor="description">
            Description{selectedType === "AGENT" ? " (required)" : ""}
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={values?.description ?? ""}
            required={selectedType === "AGENT"}
          />
          {errors?.description && (
            <div className="form-error">{errors.description}</div>
          )}
        </div>

        {selectedType === "SKILL" && (
          <div className="form-group">
            <label htmlFor="skillType">Skill Type</label>
            <select
              id="skillType"
              name="skillType"
              defaultValue={values?.skillType ?? ""}
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
            Create Component
          </button>
          <Link to={`/plugins/${plugin.id}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
