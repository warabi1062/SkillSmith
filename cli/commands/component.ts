import { parseArgs } from "node:util";
import {
  getComponents,
  getComponent,
  createComponent,
  updateComponent,
  deleteComponent,
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

// Prisma P2025（レコード未発見）エラーかどうかを判定するヘルパー
function isPrismaNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "P2025"
  );
}

// 有効な skillType の一覧
const VALID_SKILL_TYPES = [
  "ENTRY_POINT",
  "WORKER",
  "WORKER_WITH_SUB_AGENT",
  "WORKER_WITH_AGENT_TEAM",
] as const;

type SkillType = (typeof VALID_SKILL_TYPES)[number];

// skillType のバリデーション
function isValidSkillType(value: string): value is SkillType {
  return (VALID_SKILL_TYPES as readonly string[]).includes(value);
}

// 文字列フィールドの長さ表示ヘルパー
// null の場合 "(none)"、空文字列の場合 "0 chars"、それ以外は "{n} chars"
function formatCharLength(value: string | null | undefined): string {
  if (value === null || value === undefined) return "(none)";
  return `${value.length} chars`;
}

// component list: コンポーネント一覧を表示する
export async function handleList(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values } = parseCommandArgs(ctx.args, {
    plugin: { type: "string" },
  });

  const pluginId = values.plugin as string | undefined;
  if (!pluginId) {
    out.error(
      "--plugin is required. Usage: skillsmith component list --plugin <pluginId>",
    );
    return 1;
  }

  try {
    const components = await getComponents(pluginId);

    if (ctx.options.json) {
      out.success(components);
      return 0;
    }

    if (components.length === 0) {
      out.success("No components found.");
      return 0;
    }

    // テーブル形式で出力（padEnd で固定幅カラム整列）
    const idWidth = Math.max("ID".length, ...components.map((c) => c.id.length));
    const nameWidth = Math.max(
      "Name".length,
      ...components.map((c) => c.skillConfig?.name?.length ?? 0),
    );
    const typeWidth = Math.max(
      "SkillType".length,
      ...components.map((c) => (c.skillConfig?.skillType ?? "").length),
    );
    const header = `${"ID".padEnd(idWidth)}  ${"Name".padEnd(nameWidth)}  ${"SkillType".padEnd(typeWidth)}  UpdatedAt`;
    const rows = components.map(
      (c) =>
        `${c.id.padEnd(idWidth)}  ${(c.skillConfig?.name ?? "(unnamed)").padEnd(nameWidth)}  ${(c.skillConfig?.skillType ?? "").padEnd(typeWidth)}  ${c.updatedAt.toISOString()}`,
    );
    out.success([header, ...rows].join("\n"));
    return 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list components";
    out.error(message);
    return 1;
  }
}

// component show: コンポーネント詳細を表示する
export async function handleShow(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);
  const { positionals } = parseCommandArgs(ctx.args, {});
  const id = positionals[0];

  if (!id) {
    out.error("Component ID is required. Usage: skillsmith component show <id>");
    return 1;
  }

  try {
    const component = await getComponent(id);

    if (!component) {
      out.error(`Component not found: ${id}`);
      return 1;
    }

    if (ctx.options.json) {
      out.success(component);
      return 0;
    }

    const sc = component.skillConfig;

    // template と reference ファイルを検索
    const templateFile = component.files?.find((f) => f.role === "TEMPLATE");
    const referenceFile = component.files?.find((f) => f.role === "REFERENCE");

    // キー・バリュー形式で出力
    const lines = [
      `ID:           ${component.id}`,
      `PluginID:     ${component.pluginId}`,
      `Name:         ${sc?.name ?? "(none)"}`,
      `Description:  ${sc?.description ?? "(none)"}`,
      `SkillType:    ${sc?.skillType ?? "(none)"}`,
      `ArgumentHint: ${sc?.argumentHint ?? "(none)"}`,
      `AllowedTools: ${sc?.allowedTools ?? "(none)"}`,
      `Content:      ${formatCharLength(sc?.content)}`,
      `Input:        ${formatCharLength(sc?.input)}`,
      `Output:       ${formatCharLength(sc?.output)}`,
      `Template:     ${formatCharLength(templateFile?.content)}`,
      `Reference:    ${formatCharLength(referenceFile?.content)}`,
      `Files:        ${component.files?.length ?? 0}`,
      `AgentConfig:  ${sc?.agentConfig ? "yes" : "no"}`,
      `CreatedAt:    ${component.createdAt.toISOString()}`,
      `UpdatedAt:    ${component.updatedAt.toISOString()}`,
    ];

    out.success(lines.join("\n"));
    return 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to show component";
    out.error(message);
    return 1;
  }
}

// component create: コンポーネントを作成する
export async function handleCreate(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values } = parseCommandArgs(ctx.args, {
    plugin: { type: "string" },
    name: { type: "string" },
    "skill-type": { type: "string" },
    description: { type: "string" },
  });

  const pluginId = values.plugin as string | undefined;
  if (!pluginId) {
    out.error(
      "--plugin is required. Usage: skillsmith component create --plugin <pluginId> --name <name> --skill-type <type>",
    );
    return 1;
  }

  const name = values.name as string | undefined;
  if (!name) {
    out.error(
      "--name is required. Usage: skillsmith component create --plugin <pluginId> --name <name> --skill-type <type>",
    );
    return 1;
  }

  const skillType = values["skill-type"] as string | undefined;
  if (!skillType) {
    out.error(
      "--skill-type is required. Usage: skillsmith component create --plugin <pluginId> --name <name> --skill-type <type>",
    );
    return 1;
  }

  if (!isValidSkillType(skillType)) {
    out.error(
      `Invalid --skill-type: ${skillType}. Must be one of: ${VALID_SKILL_TYPES.join(", ")}`,
    );
    return 1;
  }

  try {
    const component = await createComponent(pluginId, {
      type: "SKILL",
      name,
      description: values.description as string | undefined,
      skillType,
    });

    if (ctx.options.json) {
      out.success(component);
      return 0;
    }

    out.success(
      `Created component: ${component.skillConfig?.name ?? name} (${component.id})`,
    );
    return 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create component";
    out.error(message);
    return 1;
  }
}

// component update: コンポーネントを更新する
export async function handleUpdate(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values, positionals } = parseCommandArgs(ctx.args, {
    name: { type: "string" },
    description: { type: "string" },
    "skill-type": { type: "string" },
    content: { type: "string" },
    "argument-hint": { type: "string" },
    "allowed-tools": { type: "string" },
    input: { type: "string" },
    output: { type: "string" },
  });

  const id = positionals[0];
  if (!id) {
    out.error(
      "Component ID is required. Usage: skillsmith component update <id> [--name <name>] [--description <desc>] ...",
    );
    return 1;
  }

  // 少なくとも1つの更新フィールドが指定されているか確認
  const updateFields = [
    "name",
    "description",
    "skill-type",
    "content",
    "argument-hint",
    "allowed-tools",
    "input",
    "output",
  ];
  const hasUpdate = updateFields.some((f) => values[f] !== undefined);
  if (!hasUpdate) {
    out.error(
      "At least one update option is required (--name, --description, --skill-type, --content, --argument-hint, --allowed-tools, --input, --output).",
    );
    return 1;
  }

  // skill-type のバリデーション（指定されている場合）
  const skillType = values["skill-type"] as string | undefined;
  if (skillType !== undefined && !isValidSkillType(skillType)) {
    out.error(
      `Invalid --skill-type: ${skillType}. Must be one of: ${VALID_SKILL_TYPES.join(", ")}`,
    );
    return 1;
  }

  try {
    // 既存のコンポーネントを取得して未指定フィールドの既存値を使用
    const existing = await getComponent(id);
    if (!existing) {
      out.error(`Component not found: ${id}`);
      return 1;
    }

    const sc = existing.skillConfig;

    // 部分更新データの構築（type と name, skillType は必須フィールド）
    const updateData: Parameters<typeof updateComponent>[1] = {
      type: "SKILL",
      name: (values.name as string | undefined) ?? sc?.name ?? "",
      skillType:
        (skillType as SkillType | undefined) ?? sc?.skillType ?? "WORKER",
    };

    // 任意フィールドの設定（指定された場合のみ上書き）
    if (values.description !== undefined) {
      updateData.description = values.description as string;
    }
    if (values.content !== undefined) {
      updateData.content = values.content as string;
    }
    if (values["argument-hint"] !== undefined) {
      updateData.argumentHint = values["argument-hint"] as string;
    }
    if (values["allowed-tools"] !== undefined) {
      updateData.allowedTools = values["allowed-tools"] as string;
    }
    if (values.input !== undefined) {
      updateData.input = values.input as string;
    }
    if (values.output !== undefined) {
      updateData.output = values.output as string;
    }

    const component = await updateComponent(id, updateData);

    if (ctx.options.json) {
      out.success(component);
      return 0;
    }

    out.success(
      `Updated component: ${component.skillConfig?.name ?? ""} (${component.id})`,
    );
    return 0;
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      out.error(`Component not found: ${id}`);
      return 1;
    }
    const message =
      error instanceof Error ? error.message : "Failed to update component";
    out.error(message);
    return 1;
  }
}

// component delete: コンポーネントを削除する
export async function handleDelete(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);
  const { positionals } = parseCommandArgs(ctx.args, {});
  const id = positionals[0];

  if (!id) {
    out.error("Component ID is required. Usage: skillsmith component delete <id>");
    return 1;
  }

  try {
    const component = await deleteComponent(id);

    if (ctx.options.json) {
      out.success(component);
      return 0;
    }

    out.success(`Deleted component: ${id}`);
    return 0;
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      out.error(`Component not found: ${id}`);
      return 1;
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete component";
    out.error(message);
    return 1;
  }
}

// Component コマンド群をルーターに登録する
export function registerComponentCommands(): void {
  registerCommand({
    entity: "component",
    action: "list",
    description: "List components of a plugin",
    handler: handleList,
  });

  registerCommand({
    entity: "component",
    action: "show",
    description: "Show component details",
    handler: handleShow,
  });

  registerCommand({
    entity: "component",
    action: "create",
    description: "Create a new component",
    handler: handleCreate,
  });

  registerCommand({
    entity: "component",
    action: "update",
    description: "Update a component",
    handler: handleUpdate,
  });

  registerCommand({
    entity: "component",
    action: "delete",
    description: "Delete a component",
    handler: handleDelete,
  });
}
