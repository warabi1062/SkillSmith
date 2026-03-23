import { parseArgs } from "node:util";

// コマンド固有オプションをパースするヘルパー
export function parseCommandArgs(
  args: string[],
  options: Record<string, { type: "string" | "boolean" }>,
): { values: Record<string, string | boolean | undefined>; positionals: string[] } {
  const result = parseArgs({
    args,
    options,
    allowPositionals: true,
    strict: false,
  });
  return {
    values: result.values as Record<string, string | boolean | undefined>,
    positionals: result.positionals,
  };
}
