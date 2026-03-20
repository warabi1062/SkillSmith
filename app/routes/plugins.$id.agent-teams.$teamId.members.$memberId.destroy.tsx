import { redirect, data } from "react-router";
import { getAgentTeam, removeAgentTeamMember } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id.agent-teams.$teamId.members.$memberId.destroy";

export async function action({ params }: Route.ActionArgs) {
  const team = await getAgentTeam(params.teamId);
  if (!team || team.pluginId !== params.id) {
    throw data("Agent Team not found", { status: 404 });
  }

  const member = team.members.find((m) => m.id === params.memberId);
  if (!member) {
    throw data("Member not found", { status: 404 });
  }

  await removeAgentTeamMember(params.memberId);
  return redirect(`/plugins/${params.id}/agent-teams/${params.teamId}`);
}
