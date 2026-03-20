import { redirect, data } from "react-router";
import {
  getComponentFile,
  getOutputSchemaField,
  deleteOutputSchemaField,
} from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.$fileId.fields.$fieldId.destroy";

export async function action({ params }: Route.ActionArgs) {
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

  await deleteOutputSchemaField(params.fieldId);
  return redirect(
    `/plugins/${params.id}/components/${params.componentId}/files/${params.fileId}/fields`,
  );
}
