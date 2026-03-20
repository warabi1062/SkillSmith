import { Form, Link, redirect, data } from "react-router";
import {
  getPlugin,
  getComponent,
  getComponentFile,
  updateComponentFile,
} from "../lib/plugins.server";
import { ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.$fileId.edit";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit File - SkillSmith" }];
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

  const file = await getComponentFile(params.fileId);
  if (!file || file.componentId !== params.componentId) {
    throw data("File not found", { status: 404 });
  }

  return { plugin, component, file };
}

export async function action({ request, params }: Route.ActionArgs) {
  const component = await getComponent(params.componentId);
  if (!component || component.pluginId !== params.id) {
    throw data("Component not found", { status: 404 });
  }

  const file = await getComponentFile(params.fileId);
  if (!file || file.componentId !== params.componentId) {
    throw data("File not found", { status: 404 });
  }

  const formData = await request.formData();
  const filename = String(formData.get("filename") ?? "");
  const content = String(formData.get("content") ?? "");

  try {
    await updateComponentFile(params.fileId, { filename, content });
    return redirect(
      `/plugins/${params.id}/components/${params.componentId}`,
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        {
          errors: { [error.field]: error.message },
          values: { filename, content },
        },
        { status: 400 },
      );
    }
    throw error;
  }
}

export default function EditComponentFile({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { plugin, component, file } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;

  const config = component.type === "SKILL"
    ? component.skillConfig
    : component.agentConfig;
  const componentName = config?.name ?? "(unnamed)";

  return (
    <div>
      <h2>Edit File</h2>
      <p className="card-description" style={{ marginBottom: "1rem" }}>
        Component: {componentName}
      </p>
      <Form method="post" style={{ maxWidth: "640px" }}>
        <div className="form-group">
          <label>Role</label>
          <p className="card-description">
            <span className="badge">{file.role}</span>
            {" "}(not editable)
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="filename">Filename</label>
          <input
            id="filename"
            name="filename"
            type="text"
            defaultValue={values?.filename ?? file.filename}
            required
          />
          {errors?.filename && (
            <div className="form-error">{errors.filename}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            name="content"
            className="markdown-editor"
            defaultValue={values?.content ?? file.content}
            placeholder="Write content in Markdown..."
          />
          {errors?.content && (
            <div className="form-error">{errors.content}</div>
          )}
        </div>

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
