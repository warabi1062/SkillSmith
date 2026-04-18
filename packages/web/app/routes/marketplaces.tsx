import { Link, useLoaderData } from "react-router";
import type { MarketplaceMeta } from "@warabi1062/skillsmith-core/loader";
import { fetchMarketplaces } from "../../src/api-client";

// トップ画面の client loader: /api/marketplaces を叩く
export async function loader() {
  const marketplaces = await fetchMarketplaces();
  return { marketplaces };
}

export default function Marketplaces() {
  const { marketplaces } = useLoaderData() as {
    marketplaces: MarketplaceMeta[];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold text-on-surface">
          Marketplaces
        </h2>
        <span className="font-mono text-xs text-on-surface-variant bg-surface-container px-4 py-1 rounded-full">
          {marketplaces.length} marketplace
          {marketplaces.length !== 1 ? "s" : ""}
        </span>
      </div>

      {marketplaces.length === 0 ? (
        <div className="text-center py-16 px-4 text-on-surface-variant">
          <p>No marketplaces yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] max-md:grid-cols-1 gap-4">
          {marketplaces.map((marketplace) => (
            <Link
              key={marketplace.dirName}
              to={`/marketplaces/${marketplace.dirName}`}
              className="block bg-surface-container-low rounded-md p-6 no-underline hover:no-underline hover:shadow-level1 hover:bg-surface-container"
            >
              <div className="font-display text-base font-semibold text-on-surface tracking-tight mb-1">
                {marketplace.dirName}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-variant">
                <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-5 h-5 inline-flex items-center justify-center bg-primary-container rounded-sm text-[0.625rem] font-semibold text-on-primary-container">
                    P
                  </span>
                  {marketplace.pluginCount} plugin
                  {marketplace.pluginCount !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
