import { useState } from "react";
import { Form, Link, redirect, data } from "react-router";
import {
  getPlugin,
  getComponent,
  getComponentFile,
  getOutputSchemaField,
  updateOutputSchemaField,
} from "../lib/plugins.server";
import { ValidationError } from "../lib/validations";
import { FIELD_TYPES } from "../lib/validations/output-schema-field.server";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.$fileId.fields.$fieldId.edit";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit Field - SkillSmith" }];
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

  const field = await getOutputSchemaField(params.fieldId);
  if (!field || field.componentFileId !== params.fileId) {
    throw data("Field not found", { status: 404 });
  }

  return { plugin, component, file, field };
}

export async function action({ request, params }: Route.ActionArgs) {
  const file = await getComponentFile(params.fileId);
  if (!file || file.componentId !== params.componentId) {
    throw data("File not found", { status: 404 });
  }

  if (file.role !== "OUTPUT_SCHEMA") {
    throw data("Fields are only available for OUTPUT_SCHEMA files", { status: 404 });
  }

  const field = await getOutputSchemaField(params.fieldId);
  if (!field || field.componentFileId !== params.fileId) {
    throw data("Field not found", { status: 404 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "");
  const fieldType = String(formData.get("fieldType") ?? "");
  const required = formData.get("required") === "on";
  const description = String(formData.get("description") ?? "");
  const enumValues = String(formData.get("enumValues") ?? "");
  const placeholder = String(formData.get("placeholder") ?? "");

  try {
    await updateOutputSchemaField(params.fieldId, {
      name,
      fieldType,
      required,
      description: description || undefined,
      // Clear enumValues when fieldType is not ENUM to avoid stale data
      enumValues: fieldType !== "ENUM" ? null : enumValues || undefined,
      placeholder: placeholder || undefined,
    });
    return redirect(
      `/plugins/${params.id}/components/${params.componentId}/files/${params.fileId}/fields`,
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        {
          errors: { [error.field]: error.message },
          values: { name, fieldType, required, description, enumValues, placeholder },
        },
        { status: 400 },
      );
    }
    throw error;
  }
}

export default function EditOutputSchemaField({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { plugin, component, file, field } = loaderData;
  const errors = actionData?.errors;
  const values = actionData?.values;

  const config = component.type === "SKILL"
    ? component.skillConfig
    : component.agentConfig;
  const componentName = config?.name ?? "(unnamed)";

  const [selectedFieldType, setSelectedFieldType] = useState(
    values?.fieldType ?? field.fieldType,
  );

  return (
    <div>
      <h2>Edit Field</h2>
      <p className="card-description" style={{ marginBottom: "1rem" }}>
        File: {file.filename} | Component: {componentName}
      </p>
      <Form method="post" style={{ maxWidth: "640px" }}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={values?.name ?? field.name}
            required
          />
          {errors?.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="fieldType">Field Type</label>
          <select
            id="fieldType"
            name="fieldType"
            defaultValue={values?.fieldType ?? field.fieldType}
            className="form-select"
            required
            onChange={(e) => setSelectedFieldType(e.target.value)}
          >
            <option value="">-- Select Type --</option>
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errors?.fieldType && (
            <div className="form-error">{errors.fieldType}</div>
          )}
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="required"
              defaultChecked={values?.required ?? field.required}
            />{" "}
            Required
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            defaultValue={values?.description ?? field.description ?? ""}
            placeholder="Describe this field..."
            rows={3}
          />
          {errors?.description && (
            <div className="form-error">{errors.description}</div>
          )}
        </div>

        {selectedFieldType === "ENUM" && (
          <div className="form-group">
            <label htmlFor="enumValues">Enum Values</label>
            <input
              id="enumValues"
              name="enumValues"
              type="text"
              defaultValue={values?.enumValues ?? field.enumValues ?? ""}
              placeholder="value1, value2, value3"
            />
            <p className="card-description" style={{ marginTop: "0.25rem", fontSize: "0.8rem" }}>
              Comma-separated list of allowed values.
            </p>
            {errors?.enumValues && (
              <div className="form-error">{errors.enumValues}</div>
            )}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="placeholder">Placeholder</label>
          <input
            id="placeholder"
            name="placeholder"
            type="text"
            defaultValue={values?.placeholder ?? field.placeholder ?? ""}
            placeholder="Optional placeholder text"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
          <Link
            to={`/plugins/${plugin.id}/components/${component.id}/files/${file.id}/fields`}
            className="btn btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
