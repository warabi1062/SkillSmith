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

// Prisma P2025（レコード未発見）エラーかどうかを判定するヘルパー
export function isPrismaNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "P2025"
  );
}
