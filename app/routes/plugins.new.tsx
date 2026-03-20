import { Form, Link, redirect, useActionData, data } from "react-router";
import { createPlugin } from "../lib/plugins.server";
import { validatePluginData, ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.new";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "New Plugin - SkillSmith" }];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");

  try {
    validatePluginData({ name, description: description || undefined });
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        { errors: { [error.field]: error.message }, values: { name, description } },
        { status: 400 },
      );
    }
    throw error;
  }

  const plugin = await createPlugin({
    name: name.trim(),
    description: description.trim() || undefined,
  });

  return redirect(`/plugins/${plugin.id}`);
}

export default function NewPlugin({ actionData }: Route.ComponentProps) {
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <div>
      <h2>New Plugin</h2>
      <Form method="post" style={{ maxWidth: "480px", marginTop: "1rem" }}>
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

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Create Plugin
          </button>
          <Link to="/plugins" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
