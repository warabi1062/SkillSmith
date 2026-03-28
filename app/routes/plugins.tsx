import { Link } from "react-router";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-center justify-between mb-6">
        <h2 className="mb-0">Plugins</h2>
        <Badge variant="secondary">
          {plugins.length} plugin{plugins.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {plugins.length === 0 ? (
        <div className="empty-state">
          <p>No plugins yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {plugins.map((plugin) => (
            <Link
              key={plugin.dirName}
              to={`/plugins/${plugin.dirName}`}
              className="block no-underline"
            >
              <Card className="h-full transition-all hover:border-[var(--border-default)] hover:-translate-y-0.5">
                <CardHeader>
                  <CardTitle>{plugin.name}</CardTitle>
                </CardHeader>
                {plugin.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {plugin.description}
                    </p>
                  </CardContent>
                )}
                <CardFooter>
                  <Badge variant="outline" className="gap-1.5">
                    <span className="w-3.5 h-3.5 inline-flex items-center justify-center bg-[var(--accent-teal-dim)] rounded-sm text-[0.6rem] text-[var(--accent-teal)]">
                      S
                    </span>
                    {plugin.skillCount} skill
                    {plugin.skillCount !== 1 ? "s" : ""}
                  </Badge>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
