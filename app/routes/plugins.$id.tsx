import { useState } from "react";
import { Link, data } from "react-router";
import { getPlugin } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id";
import PluginGraphSection from "../components/PluginGraphSection";
import PluginActionsSection from "../components/PluginActionsSection";

export { action } from "./plugins.$id.action.server";

interface ModalState {
  isOpen: boolean;
  mode: "create";
}

interface MembersModalState {
  isOpen: boolean;
  agentTeamComponentId?: string;
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.plugin?.name ?? "Plugin";
  return [{ title: `${name} - SkillSmith` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }
  return { plugin };
}

export default function PluginDetail({ loaderData }: Route.ComponentProps) {
  const { plugin } = loaderData;

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: "create",
  });
  const [membersModalState, setMembersModalState] = useState<MembersModalState>({
    isOpen: false,
  });

  return (
    <div className="plugin-detail-page">
      <PluginActionsSection plugin={plugin} />

      <PluginGraphSection
        plugin={plugin}
        modalState={modalState}
        onModalStateChange={setModalState}
        membersModalState={membersModalState}
        onMembersModalStateChange={setMembersModalState}
      />
    </div>
  );
}
