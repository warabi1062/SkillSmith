import { Link, Form, data } from "react-router";
import { getPlugin, getComponent, getComponentFile } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.$fileId.fields";

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [{ title: `Fields - ${loaderData?.file?.filename ?? "File"} - SkillSmith` }];
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

  if (file.role !== "OUTPUT_SCHEMA") {
    throw data("Fields are only available for OUTPUT_SCHEMA files", { status: 404 });
  }

  return { plugin, component, file };
}

export default function OutputSchemaFields({
  loaderData,
}: Route.ComponentProps) {
  const { plugin, component, file } = loaderData;

  const config = component.type === "SKILL"
    ? component.skillConfig
    : component.agentConfig;
  const componentName = config?.name ?? "(unnamed)";
  const fields = file.outputSchemaFields;

  return (
    <div>
      <div className="detail-header">
        <div>
          <h2>Output Schema Fields</h2>
          <p className="card-description">
            File: {file.filename} | Component: {componentName}
          </p>
        </div>
        <Link
          to={`/plugins/${plugin.id}/components/${component.id}/files/${file.id}/fields/new`}
          className="btn btn-primary btn-sm"
        >
          Add Field
        </Link>
      </div>

      {fields.length > 0 ? (
        <table className="data-table" style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Type</th>
              <th>Required</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id}>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <Form
                      method="post"
                      action={`/plugins/${plugin.id}/components/${component.id}/files/${file.id}/fields/${field.id}/reorder`}
                    >
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        className="btn btn-secondary btn-sm"
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                    </Form>
                    <Form
                      method="post"
                      action={`/plugins/${plugin.id}/components/${component.id}/files/${file.id}/fields/${field.id}/reorder`}
                    >
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        className="btn btn-secondary btn-sm"
                        disabled={index === fields.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </Form>
                  </div>
                </td>
                <td>{field.name}</td>
                <td>
                  <span className="badge">{field.fieldType}</span>
                  {field.fieldType === "ENUM" && field.enumValues && (
                    <span className="card-description" style={{ marginLeft: "0.5rem", fontSize: "0.75rem" }}>
                      ({field.enumValues})
                    </span>
                  )}
                </td>
                <td>{field.required ? "Yes" : "No"}</td>
                <td>{field.description ?? "-"}</td>
                <td>
                  <div className="detail-actions">
                    <Link
                      to={`/plugins/${plugin.id}/components/${component.id}/files/${file.id}/fields/${field.id}/edit`}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </Link>
                    <Form
                      method="post"
                      action={`/plugins/${plugin.id}/components/${component.id}/files/${file.id}/fields/${field.id}/destroy`}
                      onSubmit={(event) => {
                        if (!window.confirm(`Delete field "${field.name}"?`)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <button type="submit" className="btn btn-danger btn-sm">
                        Delete
                      </button>
                    </Form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="card" style={{ marginTop: "1rem" }}>
          <p className="card-description">
            No fields defined yet. Add a field to define the output schema.
          </p>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Link
          to={`/plugins/${plugin.id}/components/${component.id}`}
          className="btn btn-secondary"
        >
          Back to Component
        </Link>
      </div>
    </div>
  );
}
