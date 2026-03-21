import { data } from "react-router";
import {
  getComponent,
  createComponentFile,
} from "../lib/plugins.server";
import { ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.new";

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
    return { success: true };
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
