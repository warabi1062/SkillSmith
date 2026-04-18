import { Link } from "react-router";
import {
  loadAllPluginMetaInMarketplace,
  getMarketplacesBaseDir,
} from "@warabi1062/skillsmith-core/loader";
import type { Route } from "./+types/marketplaces.$marketplaceId._index";
import * as path from "node:path";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `${params.marketplaceId} - SkillSmith` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const marketplaceDirPath = path.join(
    getMarketplacesBaseDir(),
    params.marketplaceId,
  );
  const plugins = await loadAllPluginMetaInMarketplace(marketplaceDirPath);
  return { plugins, marketplaceId: params.marketplaceId };
}

export default function MarketplacePlugins({
  loaderData,
}: Route.ComponentProps) {
  const { plugins, marketplaceId } = loaderData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold text-on-surface">
          Plugins
        </h2>
        <span className="font-mono text-xs text-on-surface-variant bg-surface-container px-4 py-1 rounded-full">
          {plugins.length} plugin{plugins.length !== 1 ? "s" : ""}
        </span>
      </div>

      {plugins.length === 0 ? (
        <div className="text-center py-16 px-4 text-on-surface-variant">
          <p>No plugins yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] max-md:grid-cols-1 gap-4">
          {plugins.map((plugin) => (
            <Link
              key={plugin.dirName}
              to={`/marketplaces/${marketplaceId}/plugins/${plugin.dirName}`}
              className="block bg-surface-container-low rounded-md p-6 no-underline hover:no-underline hover:shadow-level1 hover:bg-surface-container"
            >
              <div className="font-display text-base font-semibold text-on-surface tracking-tight mb-1">
                {plugin.name}
              </div>
              {plugin.description && (
                <div className="text-sm text-on-surface-variant leading-relaxed mt-1">
                  {plugin.description}
                </div>
              )}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-variant">
                <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-5 h-5 inline-flex items-center justify-center bg-primary-container rounded-sm text-[0.625rem] font-semibold text-on-primary-container">
                    S
                  </span>
                  {plugin.skillCount} skill
                  {plugin.skillCount !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
