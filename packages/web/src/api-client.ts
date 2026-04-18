import type { LoadedPluginDefinition } from "@warabi1062/skillsmith-core/types";
import type {
  MarketplaceMeta,
  PluginMeta,
} from "@warabi1062/skillsmith-core/loader";

// fetch ラッパー: 非 200 の場合 Response を throw することで React Router v7 の
// ErrorBoundary / isRouteErrorResponse 経由で 404/500 を表現する
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Response(res.statusText, { status: res.status });
  }
  return (await res.json()) as T;
}

export const fetchMarketplaces = (): Promise<MarketplaceMeta[]> =>
  getJson<MarketplaceMeta[]>("/api/marketplaces");

export const fetchMarketplace = (
  id: string,
): Promise<{ marketplaceId: string; plugins: PluginMeta[] }> =>
  getJson<{ marketplaceId: string; plugins: PluginMeta[] }>(
    `/api/marketplaces/${encodeURIComponent(id)}`,
  );

export const fetchPlugin = (
  id: string,
  name: string,
): Promise<{
  plugin: LoadedPluginDefinition;
  pluginId: string;
  marketplaceId: string;
}> =>
  getJson<{
    plugin: LoadedPluginDefinition;
    pluginId: string;
    marketplaceId: string;
  }>(
    `/api/marketplaces/${encodeURIComponent(id)}/plugins/${encodeURIComponent(name)}`,
  );
