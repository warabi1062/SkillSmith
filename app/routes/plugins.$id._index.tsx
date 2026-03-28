import { data, Link } from "react-router";
import { loadPluginDefinition } from "../lib/types/loader.server";
import type { Route } from "./+types/plugins.$id._index";
import PluginActionsSection from "../components/PluginActionsSection";
import { Card, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import * as path from "node:path";

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.plugin?.name ?? "Plugin";
  return [{ title: `${name} - SkillSmith` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const pluginsDir = path.join(process.cwd(), "plugins");
  const dirPath = path.join(pluginsDir, params.id);

  try {
    const plugin = await loadPluginDefinition(dirPath);
    return { plugin, pluginId: params.id };
  } catch {
    throw data("Plugin not found", { status: 404 });
  }
}

export default function PluginDetail({ loaderData }: Route.ComponentProps) {
  const { plugin, pluginId } = loaderData;
  const orchestrators = plugin.skills.filter(s => s.skillType === "ENTRY_POINT");

  return (
    <div className="flex flex-col flex-1 min-h-0 relative animate-in fade-in slide-in-from-bottom-2 duration-400">
      <PluginActionsSection
        plugin={{ name: plugin.name, description: plugin.description ?? null }}
      />

      {orchestrators.length > 0 && (
        <div className="mt-2 flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b border-border">
            Orchestrators
          </div>
          {orchestrators.map(orch => (
            <Link
              key={orch.name}
              to={`/plugins/${pluginId}/orchestrators/${orch.name}`}
              className="block [&+&]:mt-3"
            >
              <Card className="transition-all hover:border-foreground/20 hover:bg-accent hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle>{orch.name}</CardTitle>
                  {orch.description && (
                    <CardDescription>{orch.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
