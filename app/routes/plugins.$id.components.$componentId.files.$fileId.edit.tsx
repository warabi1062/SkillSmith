import { data } from "react-router";
import {
  getComponent,
  getComponentFile,
  updateComponentFile,
} from "../lib/plugins.server";
import { ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.$fileId.edit";

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
    return { success: true };
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
