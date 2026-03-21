import { data } from "react-router";
import { getDependency, reorderDependency } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.dependencies.$dependencyId.reorder";

export async function action({ request, params }: Route.ActionArgs) {
  const dependency = await getDependency(params.dependencyId);
  if (!dependency || dependency.source.pluginId !== params.id) {
    throw data("Dependency not found", { status: 404 });
  }

  const formData = await request.formData();
  const direction = String(formData.get("direction") ?? "");

  if (direction !== "up" && direction !== "down") {
    throw data("direction must be 'up' or 'down'", { status: 400 });
  }

  await reorderDependency(params.dependencyId, direction);
  return { success: true };
}
