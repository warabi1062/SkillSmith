import { Link } from "react-router";
import { loadAllPluginMeta } from "../lib/types/loader.server";
import type { Route } from "./+types/plugins";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Plugins - SkillSmith" }];
}

export async function loader(_args: Route.LoaderArgs) {
  const plugins = await loadAllPluginMeta();
  return { plugins };
}

export default function Plugins({ loaderData }: Route.ComponentProps) {
  const { plugins } = loaderData;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-[1.375rem] font-semibold text-text-primary">
          Plugins
        </h2>
        <span className="font-mono text-xs text-text-tertiary bg-bg-surface px-4 py-1 rounded-full border border-border-subtle">
          {plugins.length} plugin{plugins.length !== 1 ? "s" : ""}
        </span>
      </div>

      {plugins.length === 0 ? (
        <div className="text-center py-16 px-4 text-text-tertiary">
          <p>No plugins yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] max-md:grid-cols-1 gap-4">
          {plugins.map((plugin) => (
            <Link
              key={plugin.dirName}
              to={`/plugins/${plugin.dirName}`}
              className="block bg-bg-surface border border-border-subtle rounded-lg px-6 py-6 transition-all relative overflow-hidden hover:border-border-strong hover:bg-bg-elevated hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="font-display text-base font-semibold text-text-primary tracking-tight mb-1">
                {plugin.name}
              </div>
              {plugin.description && (
                <div className="text-sm text-text-secondary leading-normal">
                  {plugin.description}
                </div>
              )}
              <div className="flex items-center gap-2 mt-4 pt-2 border-t border-border-subtle">
                <span className="font-mono text-xs text-text-tertiary flex items-center gap-1">
                  <span className="w-3.5 h-3.5 inline-flex items-center justify-center bg-accent-teal-dim rounded-[3px] text-[0.6rem] text-accent-teal">
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
