import { Link } from "react-router";
import { loadAllMarketplaceMeta } from "../lib/loader";
import type { Route } from "./+types/marketplaces";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "SkillSmith" }];
}

export async function loader(_args: Route.LoaderArgs) {
  const marketplaces = await loadAllMarketplaceMeta();
  return { marketplaces };
}

export default function Marketplaces({ loaderData }: Route.ComponentProps) {
  const { marketplaces } = loaderData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-[1.375rem] font-semibold text-text-primary">
          Marketplaces
        </h2>
        <span className="font-mono text-xs text-text-tertiary bg-bg-surface px-4 py-1 rounded-full border border-border-subtle">
          {marketplaces.length} marketplace
          {marketplaces.length !== 1 ? "s" : ""}
        </span>
      </div>

      {marketplaces.length === 0 ? (
        <div className="text-center py-16 px-4 text-text-tertiary">
          <p>No marketplaces yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] max-md:grid-cols-1 gap-4">
          {marketplaces.map((marketplace) => (
            <Link
              key={marketplace.dirName}
              to={`/marketplaces/${marketplace.dirName}`}
              className="block bg-bg-surface border border-border-subtle rounded-lg px-6 py-6 transition-all relative overflow-hidden hover:border-border-strong hover:bg-bg-elevated hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="font-display text-base font-semibold text-text-primary tracking-tight mb-1">
                {marketplace.dirName}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border-subtle">
                <span className="font-mono text-xs text-text-tertiary flex items-center gap-1">
                  <span className="w-3.5 h-3.5 inline-flex items-center justify-center bg-accent-teal-dim rounded-[3px] text-[0.6rem] text-accent-teal">
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
