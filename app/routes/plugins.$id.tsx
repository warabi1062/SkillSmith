import { data, Outlet } from "react-router";
import { loadPluginDefinition } from "../lib/types/loader.server";
import type { Route } from "./+types/plugins.$id";
import Breadcrumb from "../components/Breadcrumb";
import * as path from "node:path";

export async function loader({ params }: Route.LoaderArgs) {
  const pluginsDir = path.join(process.cwd(), "plugins");
  const dirPath = path.join(pluginsDir, params.id);

  try {
    const plugin = await loadPluginDefinition(dirPath);
    return { pluginName: plugin.name, pluginId: params.id };
  } catch {
    throw data("Plugin not found", { status: 404 });
  }
}

// ブレッドクラム: 「プラグイン一覧 > {プラグイン名}」
export const handle = {
  breadcrumb: ({ data: loaderData }: { data: { pluginName: string } }) => ({
    label: loaderData.pluginName,
  }),
};

export default function PluginLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Breadcrumb />
      <Outlet context={loaderData} />
    </>
  );
}
