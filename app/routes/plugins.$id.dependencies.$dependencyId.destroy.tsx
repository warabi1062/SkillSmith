import { data } from "react-router";
import { getDependency, deleteDependency } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.dependencies.$dependencyId.destroy";

export async function action({ params }: Route.ActionArgs) {
  const dependency = await getDependency(params.dependencyId);
  if (!dependency || dependency.source.pluginId !== params.id) {
    throw data("Dependency not found", { status: 404 });
  }

  await deleteDependency(params.dependencyId);
  return { success: true };
}
