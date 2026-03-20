import { redirect, data } from "react-router";
import { getComponent, deleteComponent } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.components.$componentId.destroy";

export async function action({ params }: Route.ActionArgs) {
  const component = await getComponent(params.componentId);
  if (!component || component.pluginId !== params.id) {
    throw data("Component not found", { status: 404 });
  }

  await deleteComponent(params.componentId);
  return redirect(`/plugins/${params.id}`);
}
