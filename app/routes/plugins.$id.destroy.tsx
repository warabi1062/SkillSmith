import { redirect, data } from "react-router";
import { getPlugin, deletePlugin } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.destroy";

export async function action({ params }: Route.ActionArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }

  await deletePlugin(params.id);
  return redirect("/plugins");
}
