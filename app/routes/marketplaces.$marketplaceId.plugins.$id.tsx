import { data, Outlet } from "react-router";
import { loadPluginDefinition } from "../lib/types/loader.server";
import type { Route } from "./+types/marketplaces.$marketplaceId.plugins.$id";
import * as path from "node:path";

export async function loader({ params }: Route.LoaderArgs) {
  const dirPath = path.join(
    process.cwd(),
    "marketplaces",
    params.marketplaceId,
    "plugins",
    params.id,
  );

  try {
    const plugin = await loadPluginDefinition(dirPath);
    return {
      pluginName: plugin.name,
      pluginId: params.id,
      marketplaceId: params.marketplaceId,
    };
  } catch {
    throw data("Plugin not found", { status: 404 });
  }
}

// ブレッドクラム: プラグイン名を表示
export const handle = {
  breadcrumb: ({ data: loaderData }: { data: { pluginName: string } }) => ({
    label: loaderData.pluginName,
  }),
};

export default function PluginLayout({ loaderData }: Route.ComponentProps) {
  return <Outlet context={loaderData} />;
}
