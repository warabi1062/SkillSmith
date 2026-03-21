import { data } from "react-router";
import {
  getComponentFile,
  createOutputSchemaField,
} from "../lib/plugins.server";
import { ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.$fileId.fields.new";

export async function action({ request, params }: Route.ActionArgs) {
  const file = await getComponentFile(params.fileId);
  if (!file || file.componentId !== params.componentId) {
    throw data("File not found", { status: 404 });
  }

  if (file.role !== "OUTPUT_SCHEMA") {
    throw data("Fields are only available for OUTPUT_SCHEMA files", { status: 404 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "");
  const fieldType = String(formData.get("fieldType") ?? "");
  const required = formData.get("required") === "on";
  const description = String(formData.get("description") ?? "");
  const enumValues = String(formData.get("enumValues") ?? "");
  const placeholder = String(formData.get("placeholder") ?? "");

  try {
    await createOutputSchemaField(params.fileId, {
      name,
      fieldType,
      required,
      description: description || undefined,
      enumValues: enumValues || undefined,
      placeholder: placeholder || undefined,
    });
    return { success: true };
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
