import {
  createDependency,
  deleteDependency,
  reorderDependency,
} from "../../app/lib/plugins.server";
import { ValidationError } from "../../app/lib/validations";
import { parseCommandArgs, isPrismaNotFoundError } from "../command-utils";
import { createOutput } from "../output";
import type { OutputStreams } from "../output";
import { registerCommand } from "../router";
import type { CommandContext } from "../types";

// テスト用に出力先を差し替え可能にする
let outputStreams: OutputStreams | undefined;

// 出力先を設定する（テスト用）
export function setOutputStreams(streams: OutputStreams | undefined): void {
  outputStreams = streams;
}

// 有効な direction の一覧
const VALID_DIRECTIONS = ["up", "down"] as const;

type Direction = (typeof VALID_DIRECTIONS)[number];

// direction のバリデーション
function isValidDirection(value: string): value is Direction {
  return (VALID_DIRECTIONS as readonly string[]).includes(value);
}

// dependency add: 依存関係を追加する
export async function handleAdd(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values } = parseCommandArgs(ctx.args, {
    source: { type: "string" },
    target: { type: "string" },
  });

  const sourceId = values.source as string | undefined;
  if (!sourceId) {
    out.error(
      "--source is required. Usage: skillsmith dependency add --source <id> --target <id>",
    );
    return 1;
  }

  const targetId = values.target as string | undefined;
  if (!targetId) {
    out.error(
      "--target is required. Usage: skillsmith dependency add --source <id> --target <id>",
    );
    return 1;
  }

  try {
    const dependency = await createDependency({ sourceId, targetId });

    if (ctx.options.json) {
      out.success(dependency);
      return 0;
    }

    out.success(`Added dependency: ${dependency.id}`);
    return 0;
  } catch (error) {
    if (error instanceof ValidationError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
}

// dependency remove: 依存関係を削除する
export async function handleRemove(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);
  const { positionals } = parseCommandArgs(ctx.args, {});
  const id = positionals[0];

  if (!id) {
    out.error(
      "Dependency ID is required. Usage: skillsmith dependency remove <id>",
    );
    return 1;
  }

  try {
    await deleteDependency(id);

    if (ctx.options.json) {
      out.success({ id });
      return 0;
    }

    out.success(`Removed dependency: ${id}`);
    return 0;
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      out.error("Dependency not found");
      return 1;
    }
    throw error;
  }
}

// dependency reorder: 依存関係の順序を変更する
export async function handleReorder(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values, positionals } = parseCommandArgs(ctx.args, {
    direction: { type: "string" },
  });

  const id = positionals[0];
  if (!id) {
    out.error(
      "Dependency ID is required. Usage: skillsmith dependency reorder <id> --direction <up|down>",
    );
    return 1;
  }

  const direction = values.direction as string | undefined;
  if (!direction) {
    out.error(
      "--direction is required. Usage: skillsmith dependency reorder <id> --direction <up|down>",
    );
    return 1;
  }

  if (!isValidDirection(direction)) {
    out.error(
      `Invalid --direction: ${direction}. Must be one of: ${VALID_DIRECTIONS.join(", ")}`,
    );
    return 1;
  }

  try {
    await reorderDependency(id, direction);

    if (ctx.options.json) {
      out.success({ id, direction });
      return 0;
    }

    out.success(`Reordered dependency: ${id} (${direction})`);
    return 0;
  } catch (error) {
    if (error instanceof ValidationError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
}

// Dependency コマンド群をルーターに登録する
export function registerDependencyCommands(): void {
  registerCommand({
    entity: "dependency",
    action: "add",
    description: "Add a dependency between components",
    handler: handleAdd,
  });

  registerCommand({
    entity: "dependency",
    action: "remove",
    description: "Remove a dependency",
    handler: handleRemove,
  });

  registerCommand({
    entity: "dependency",
    action: "reorder",
    description: "Reorder a dependency",
    handler: handleReorder,
  });
}
