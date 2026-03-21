import { data } from "react-router";
import { getComponent, getComponentFile, deleteComponentFile } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.components.$componentId.files.$fileId.destroy";

export async function action({ params }: Route.ActionArgs) {
  const component = await getComponent(params.componentId);
  if (!component || component.pluginId !== params.id) {
    throw data("Component not found", { status: 404 });
  }

  const file = await getComponentFile(params.fileId);
  if (!file || file.componentId !== params.componentId) {
    throw data("File not found", { status: 404 });
  }

  await deleteComponentFile(params.fileId);
  return { success: true };
}
