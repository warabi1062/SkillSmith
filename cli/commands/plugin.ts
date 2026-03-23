import { parseArgs } from "node:util";
import {
  getPlugins,
  getPlugin,
  createPlugin,
  updatePlugin,
  deletePlugin,
} from "../../app/lib/plugins.server";
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

// コマンド固有オプションをパースするヘルパー
function parseCommandArgs(
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

// plugin list: プラグイン一覧を表示する
export async function handleList(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  try {
    const plugins = await getPlugins();

    if (ctx.options.json) {
      out.success(plugins);
      return 0;
    }

    if (plugins.length === 0) {
      out.success("No plugins found.");
      return 0;
    }

    // テーブル形式で出力
    const header = "ID\tName\tComponents\tUpdatedAt";
    const rows = plugins.map(
      (p) =>
        `${p.id}\t${p.name}\t${p._count.components}\t${p.updatedAt.toISOString()}`,
    );
    out.success([header, ...rows].join("\n"));
    return 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list plugins";
    out.error(message);
    return 1;
  }
}

// plugin show: プラグイン詳細を表示する
export async function handleShow(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);
  const id = ctx.args[0];

  if (!id) {
    out.error("Plugin ID is required. Usage: skillsmith plugin show <id>");
    return 1;
  }

  try {
    const plugin = await getPlugin(id);

    if (!plugin) {
      out.error(`Plugin not found: ${id}`);
      return 1;
    }

    if (ctx.options.json) {
      out.success(plugin);
      return 0;
    }

    // キー・バリュー形式で出力
    const lines = [
      `ID:          ${plugin.id}`,
      `Name:        ${plugin.name}`,
      `Description: ${plugin.description ?? "(none)"}`,
      `CreatedAt:   ${plugin.createdAt.toISOString()}`,
      `UpdatedAt:   ${plugin.updatedAt.toISOString()}`,
    ];

    if (plugin.components.length > 0) {
      lines.push("", "Components:");
      for (const comp of plugin.components) {
        const name = comp.skillConfig?.name ?? "(unnamed)";
        const type = comp.skillConfig?.skillType ?? comp.type;
        lines.push(`  - ${name} (${type})`);
      }
    } else {
      lines.push("", "Components: (none)");
    }

    out.success(lines.join("\n"));
    return 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to show plugin";
    out.error(message);
    return 1;
  }
}

// plugin create: プラグインを作成する
export async function handleCreate(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values } = parseCommandArgs(ctx.args, {
    name: { type: "string" },
    description: { type: "string" },
  });

  const name = values.name as string | undefined;
  if (!name) {
    out.error("--name is required. Usage: skillsmith plugin create --name <name>");
    return 1;
  }

  try {
    const plugin = await createPlugin({
      name,
      description: values.description as string | undefined,
    });

    if (ctx.options.json) {
      out.success(plugin);
      return 0;
    }

    out.success(`Created plugin: ${plugin.name} (${plugin.id})`);
    return 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create plugin";
    out.error(message);
    return 1;
  }
}

// plugin update: プラグインを更新する
export async function handleUpdate(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values, positionals } = parseCommandArgs(ctx.args, {
    name: { type: "string" },
    description: { type: "string" },
  });

  const id = positionals[0];
  if (!id) {
    out.error(
      "Plugin ID is required. Usage: skillsmith plugin update <id> --name <name>",
    );
    return 1;
  }

  const name = values.name as string | undefined;
  if (!name) {
    out.error(
      "--name is required. Usage: skillsmith plugin update <id> --name <name>",
    );
    return 1;
  }

  try {
    const plugin = await updatePlugin(id, {
      name,
      description: values.description as string | undefined,
    });

    if (ctx.options.json) {
      out.success(plugin);
      return 0;
    }

    out.success(`Updated plugin: ${plugin.name} (${plugin.id})`);
    return 0;
  } catch (error) {
    // Prisma P2025: レコードが見つからない
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      out.error(`Plugin not found: ${id}`);
      return 1;
    }
    const message =
      error instanceof Error ? error.message : "Failed to update plugin";
    out.error(message);
    return 1;
  }
}

// plugin delete: プラグインを削除する
export async function handleDelete(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);
  const id = ctx.args[0];

  if (!id) {
    out.error("Plugin ID is required. Usage: skillsmith plugin delete <id>");
    return 1;
  }

  try {
    const plugin = await deletePlugin(id);

    if (ctx.options.json) {
      out.success(plugin);
      return 0;
    }

    out.success(`Deleted plugin: ${plugin.name} (${plugin.id})`);
    return 0;
  } catch (error) {
    // Prisma P2025: レコードが見つからない
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      out.error(`Plugin not found: ${id}`);
      return 1;
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete plugin";
    out.error(message);
    return 1;
  }
}

// Plugin コマンド群をルーターに登録する
export function registerPluginCommands(): void {
  registerCommand({
    entity: "plugin",
    action: "list",
    description: "List all plugins",
    handler: handleList,
  });

  registerCommand({
    entity: "plugin",
    action: "show",
    description: "Show plugin details",
    handler: handleShow,
  });

  registerCommand({
    entity: "plugin",
    action: "create",
    description: "Create a new plugin",
    handler: handleCreate,
  });

  registerCommand({
    entity: "plugin",
    action: "update",
    description: "Update a plugin",
    handler: handleUpdate,
  });

  registerCommand({
    entity: "plugin",
    action: "delete",
    description: "Delete a plugin",
    handler: handleDelete,
  });
}
