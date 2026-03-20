import { Link, Form, data } from "react-router";
import { getPlugin, getComponent } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.components.$componentId";
import type { ComponentFileRole } from "../generated/prisma/client";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name =
    loaderData?.component?.skillConfig?.name ??
    loaderData?.component?.agentConfig?.name ??
    "Component";
  return [{ title: `${name} - SkillSmith` }];
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

export default function ComponentDetail({
  loaderData,
}: Route.ComponentProps) {
  const { plugin, component } = loaderData;

  const isSkill = component.type === "SKILL";
  const config = isSkill ? component.skillConfig : component.agentConfig;
  const name = config?.name ?? "(unnamed)";

  return (
    <div>
      <div className="detail-header">
        <div>
          <h2>{name}</h2>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span className={`badge ${isSkill ? "badge-skill" : "badge-agent"}`}>
              {component.type}
            </span>
            {isSkill && component.skillConfig?.skillType && (
              <span className="badge">{component.skillConfig.skillType}</span>
            )}
          </div>
        </div>
        <div className="detail-actions">
          <Link
            to={`/plugins/${plugin.id}/components/${component.id}/edit`}
            className="btn btn-secondary"
          >
            Edit
          </Link>
          <Form
            method="post"
            action={`/plugins/${plugin.id}/components/${component.id}/destroy`}
            onSubmit={(event) => {
              const confirmed = window.confirm(
                `Component "${name}" will be deleted. Are you sure?`,
              );
              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <button type="submit" className="btn btn-danger">
              Delete
            </button>
          </Form>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>Configuration</h3>
        <dl className="config-list">
          <div className="config-item">
            <dt>Name</dt>
            <dd>{config?.name ?? "-"}</dd>
          </div>
          <div className="config-item">
            <dt>Description</dt>
            <dd>{config?.description ?? "-"}</dd>
          </div>
          {isSkill && component.skillConfig && (
            <div className="config-item">
              <dt>Skill Type</dt>
              <dd>{component.skillConfig.skillType}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="component-list-header">
          <h3>Files ({component.files.length})</h3>
          <Link
            to={`/plugins/${plugin.id}/components/${component.id}/files/new`}
            className="btn btn-primary btn-sm"
          >
            Add File
          </Link>
        </div>
        {component.files.length > 0 ? (
          <div style={{ marginTop: "0.5rem" }}>
            {component.files.map((file) => (
              <div key={file.id} className="component-item">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="component-item-name">{file.filename}</span>
                  <span className={`badge${file.role === "MAIN" ? " badge-skill" : ""}`}>
                    {file.role}
                  </span>
                </div>
                <div className="detail-actions">
                  {(file.role as ComponentFileRole) === "OUTPUT_SCHEMA" && (
                    <Link
                      to={`/plugins/${plugin.id}/components/${component.id}/files/${file.id}/fields`}
                      className="btn btn-primary btn-sm"
                    >
                      Manage Fields
                    </Link>
                  )}
                  <Link
                    to={`/plugins/${plugin.id}/components/${component.id}/files/${file.id}/edit`}
                    className="btn btn-secondary btn-sm"
                  >
                    Edit
                  </Link>
                  <Form
                    method="post"
                    action={`/plugins/${plugin.id}/components/${component.id}/files/${file.id}/destroy`}
                    onSubmit={(event) => {
                      const message = (file.role as ComponentFileRole) === "OUTPUT_SCHEMA"
                        ? "This file has OUTPUT_SCHEMA role. Deleting it will also remove all associated OutputSchemaField data. Are you sure?"
                        : "Are you sure you want to delete this file?";
                      if (!window.confirm(message)) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <button type="submit" className="btn btn-danger btn-sm">
                      Delete
                    </button>
                  </Form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="card-description" style={{ marginTop: "0.5rem" }}>
            No files yet.
          </p>
        )}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link to={`/plugins/${plugin.id}`} className="btn btn-secondary">
          Back to Plugin
        </Link>
      </div>
    </div>
  );
}
