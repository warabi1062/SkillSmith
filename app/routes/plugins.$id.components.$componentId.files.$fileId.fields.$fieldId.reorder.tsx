import { redirect, data } from "react-router";
import {
  getComponentFile,
  getOutputSchemaField,
  reorderOutputSchemaField,
} from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.$fileId.fields.$fieldId.reorder";

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
  const direction = String(formData.get("direction") ?? "");

  if (direction === "up" || direction === "down") {
    await reorderOutputSchemaField(params.fieldId, direction);
  }

  return redirect(
    `/plugins/${params.id}/components/${params.componentId}/files/${params.fileId}/fields`,
  );
}
