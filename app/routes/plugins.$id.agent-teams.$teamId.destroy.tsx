import { redirect, data } from "react-router";
import { getAgentTeam, deleteAgentTeam } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.agent-teams.$teamId.destroy";

export async function action({ params }: Route.ActionArgs) {
  const team = await getAgentTeam(params.teamId);
  if (!team || team.pluginId !== params.id) {
    throw data("Agent Team not found", { status: 404 });
  }

  await deleteAgentTeam(params.teamId);
  return redirect(`/plugins/${params.id}`);
}
