import { useState } from "react";
import { Form, Link, redirect, data } from "react-router";
import {
  getPlugin,
  getComponent,
  createComponentFile,
} from "../lib/plugins.server";
import { ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.new";

const ALL_ROLES = [
  { value: "MAIN", label: "MAIN" },
  { value: "TEMPLATE", label: "TEMPLATE" },
  { value: "REFERENCE", label: "REFERENCE" },
  { value: "EXAMPLE", label: "EXAMPLE" },
  { value: "OUTPUT_SCHEMA", label: "OUTPUT_SCHEMA" },
];

export function meta(_args: Route.MetaArgs) {
  return [{ title: "New File - SkillSmith" }];
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

  const existingRoles = component.files.map((f) => f.role);
  const hasMain = existingRoles.includes("MAIN");

  return { plugin, component, hasMain };
}

export async function action({ request, params }: Route.ActionArgs) {
  const component = await getComponent(params.componentId);
  if (!component || component.pluginId !== params.id) {
    throw data("Component not found", { status: 404 });
  }

  const formData = await request.formData();
  const role = String(formData.get("role") ?? "");
  const filename = String(formData.get("filename") ?? "");
  const content = String(formData.get("content") ?? "");

  try {
    await createComponentFile(params.componentId, {
      role,
      filename,
      content,
    });
    return redirect(
      `/plugins/${params.id}/components/${params.componentId}`,
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        {
          errors: { [error.field]: error.message },
          values: { role, filename, content },
        },
        { status: 400 },
      );
    }
    throw error;
  }
}

export default function NewComponentFile({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { plugin, component, hasMain } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;

  const config = component.type === "SKILL"
    ? component.skillConfig
    : component.agentConfig;
  const componentName = config?.name ?? "(unnamed)";

  const availableRoles = hasMain
    ? ALL_ROLES.filter((r) => r.value !== "MAIN")
    : ALL_ROLES;

  const [selectedRole, setSelectedRole] = useState(values?.role ?? "");

  return (
    <div>
      <h2>New File</h2>
      <p className="card-description" style={{ marginBottom: "1rem" }}>
        Component: {componentName}
      </p>
      <Form method="post" style={{ maxWidth: "640px" }}>
        <div className="form-group">
          <label htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            defaultValue={values?.role ?? ""}
            className="form-select"
            required
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">-- Select Role --</option>
            {availableRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {errors?.role && <div className="form-error">{errors.role}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="filename">Filename</label>
          <input
            id="filename"
            name="filename"
            type="text"
            defaultValue={values?.filename ?? ""}
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
            defaultValue={values?.content ?? ""}
            placeholder="Write content in Markdown..."
          />
          {errors?.content && (
            <div className="form-error">{errors.content}</div>
          )}
          {selectedRole === "OUTPUT_SCHEMA" && (
            <p className="card-description" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              Note: If you select OUTPUT_SCHEMA role, OutputSchemaField management will be available separately.
            </p>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Create File
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
