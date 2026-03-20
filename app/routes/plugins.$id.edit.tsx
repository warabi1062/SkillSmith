import { Form, Link, redirect, useActionData, data } from "react-router";
import { getPlugin, updatePlugin } from "../lib/plugins.server";
import { validatePluginData, ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.edit";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit Plugin - SkillSmith" }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }
  return { plugin };
}

export async function action({ request, params }: Route.ActionArgs) {
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

  await updatePlugin(params.id, {
    name: name.trim(),
    description: description.trim() || undefined,
  });

  return redirect(`/plugins/${params.id}`);
}

export default function EditPlugin({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { plugin } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <div>
      <h2>Edit Plugin</h2>
      <Form method="post" style={{ maxWidth: "480px", marginTop: "1rem" }}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={values?.name ?? plugin.name}
            required
          />
          {errors?.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            defaultValue={values?.description ?? plugin.description ?? ""}
          />
          {errors?.description && (
            <div className="form-error">{errors.description}</div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
          <Link to={`/plugins/${plugin.id}`} className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
