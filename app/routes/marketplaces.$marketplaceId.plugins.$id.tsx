import { data, Outlet } from "react-router";
import {
  loadPluginDefinition,
  getMarketplacesBaseDir,
} from "../lib/loader";
import type { LoadedPluginDefinition } from "../lib/types/loaded";
import type { Route } from "./+types/marketplaces.$marketplaceId.plugins.$id";
import * as path from "node:path";

// 子ルートが useOutletContext で受け取る型
export type PluginOutletContext = {
  plugin: LoadedPluginDefinition;
  pluginId: string;
  marketplaceId: string;
};

export async function loader({ params }: Route.LoaderArgs) {
  const dirPath = path.join(
    getMarketplacesBaseDir(),
    params.marketplaceId,
    "plugins",
    params.id,
  );

  try {
    const plugin = await loadPluginDefinition(dirPath);
    return {
      plugin,
      pluginId: params.id,
      marketplaceId: params.marketplaceId,
    };
  } catch {
    throw data("Plugin not found", { status: 404 });
  }
}

// ブレッドクラム: プラグイン名を表示
export const handle = {
  breadcrumb: ({
    data: loaderData,
    params,
  }: {
    data: { plugin: { name: string } };
    params: Record<string, string | undefined>;
  }) => ({
    label: loaderData.plugin.name,
    to: `/marketplaces/${params.marketplaceId}/plugins/${params.id}`,
  }),
};

export default function PluginLayout({ loaderData }: Route.ComponentProps) {
  return <Outlet context={loaderData} />;
}
