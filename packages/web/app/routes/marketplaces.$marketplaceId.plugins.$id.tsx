import { Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import type { LoadedPluginDefinition } from "@warabi1062/skillsmith-core/types";
import { fetchPlugin } from "../../src/api-client";

// 子ルートが useOutletContext で受け取る型
export type PluginOutletContext = {
  plugin: LoadedPluginDefinition;
  pluginId: string;
  marketplaceId: string;
};

export async function loader({ params }: LoaderFunctionArgs) {
  const marketplaceId = params.marketplaceId ?? "";
  const pluginId = params.id ?? "";
  // api-client が非 200 で Response を throw するので 404 はそのまま伝播する
  return await fetchPlugin(marketplaceId, pluginId);
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

export default function PluginLayout() {
  const loaderData = useLoaderData() as PluginOutletContext;
  return <Outlet context={loaderData} />;
}
