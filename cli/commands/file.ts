import {
  getComponentFiles,
  getComponentFile,
  createComponentFile,
  updateComponentFile,
  deleteComponentFile,
} from "../../app/lib/plugins.server";
import { ValidationError } from "../../app/lib/validations";
import { parseCommandArgs } from "../command-utils";
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

// 有効な role の一覧
const VALID_ROLES = ["TEMPLATE", "REFERENCE", "EXAMPLE"] as const;

type Role = (typeof VALID_ROLES)[number];

// role のバリデーション
function isValidRole(value: string): value is Role {
  return (VALID_ROLES as readonly string[]).includes(value);
}

// file list: ファイル一覧を表示する
export async function handleList(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values } = parseCommandArgs(ctx.args, {
    component: { type: "string" },
  });

  const componentId = values.component as string | undefined;
  if (!componentId) {
    out.error(
      "--component is required. Usage: skillsmith file list --component <componentId>",
    );
    return 1;
  }

  const files = await getComponentFiles(componentId);

  if (ctx.options.json) {
    out.success(files);
    return 0;
  }

  if (files.length === 0) {
    out.success("No files found.");
    return 0;
  }

  // テーブル形式で出力（padEnd で固定幅カラム整列）
  const idWidth = Math.max("ID".length, ...files.map((f) => f.id.length));
  const roleWidth = Math.max(
    "Role".length,
    ...files.map((f) => f.role.length),
  );
  const filenameWidth = Math.max(
    "Filename".length,
    ...files.map((f) => f.filename.length),
  );
  const sortOrderWidth = "SortOrder".length;
  const header = `${"ID".padEnd(idWidth)}  ${"Role".padEnd(roleWidth)}  ${"Filename".padEnd(filenameWidth)}  SortOrder`;
  const rows = files.map(
    (f) =>
      `${f.id.padEnd(idWidth)}  ${f.role.padEnd(roleWidth)}  ${f.filename.padEnd(filenameWidth)}  ${String(f.sortOrder).padEnd(sortOrderWidth)}`,
  );
  out.success([header, ...rows].join("\n"));
  return 0;
}

// file create: ファイルを作成する
export async function handleCreate(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values } = parseCommandArgs(ctx.args, {
    component: { type: "string" },
    role: { type: "string" },
    filename: { type: "string" },
    content: { type: "string" },
  });

  const componentId = values.component as string | undefined;
  if (!componentId) {
    out.error(
      "--component is required. Usage: skillsmith file create --component <componentId> --role <role> --filename <filename>",
    );
    return 1;
  }

  const role = values.role as string | undefined;
  if (!role) {
    out.error(
      "--role is required. Usage: skillsmith file create --component <componentId> --role <role> --filename <filename>",
    );
    return 1;
  }

  if (!isValidRole(role)) {
    out.error(
      `Invalid --role: ${role}. Must be one of: ${VALID_ROLES.join(", ")}`,
    );
    return 1;
  }

  const filename = values.filename as string | undefined;
  if (!filename) {
    out.error(
      "--filename is required. Usage: skillsmith file create --component <componentId> --role <role> --filename <filename>",
    );
    return 1;
  }

  const content = (values.content as string | undefined) ?? "";

  try {
    const file = await createComponentFile(componentId, {
      role,
      filename,
      content,
    });

    if (ctx.options.json) {
      out.success(file);
      return 0;
    }

    out.success(`Created file: ${file.filename} (${file.id})`);
    return 0;
  } catch (error) {
    if (error instanceof ValidationError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
}

// file update: ファイルを更新する
export async function handleUpdate(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);

  const { values, positionals } = parseCommandArgs(ctx.args, {
    filename: { type: "string" },
    content: { type: "string" },
  });

  const id = positionals[0];
  if (!id) {
    out.error(
      "File ID is required. Usage: skillsmith file update <id> [--filename <filename>] [--content <content>]",
    );
    return 1;
  }

  // 少なくとも1つの更新フィールドが指定されているか確認
  const hasUpdate =
    values.filename !== undefined || values.content !== undefined;
  if (!hasUpdate) {
    out.error(
      "At least one update option is required (--filename, --content).",
    );
    return 1;
  }

  try {
    // 既存のファイルを取得して未指定フィールドの既存値を使用
    const existing = await getComponentFile(id);
    if (!existing) {
      out.error(`File not found: ${id}`);
      return 1;
    }

    const filename =
      (values.filename as string | undefined) ?? existing.filename;
    const content =
      (values.content as string | undefined) ?? existing.content;

    const file = await updateComponentFile(id, { filename, content });

    if (ctx.options.json) {
      out.success(file);
      return 0;
    }

    out.success(`Updated file: ${file.filename} (${file.id})`);
    return 0;
  } catch (error) {
    if (error instanceof ValidationError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
}

// file delete: ファイルを削除する
export async function handleDelete(ctx: CommandContext): Promise<number> {
  const out = createOutput(ctx.options, outputStreams);
  const { positionals } = parseCommandArgs(ctx.args, {});
  const id = positionals[0];

  if (!id) {
    out.error("File ID is required. Usage: skillsmith file delete <id>");
    return 1;
  }

  try {
    const file = await deleteComponentFile(id);

    if (ctx.options.json) {
      out.success(file);
      return 0;
    }

    out.success(`Deleted file: ${id}`);
    return 0;
  } catch (error) {
    if (error instanceof ValidationError) {
      out.error(error.message);
      return 1;
    }
    throw error;
  }
}

// File コマンド群をルーターに登録する
export function registerFileCommands(): void {
  registerCommand({
    entity: "file",
    action: "list",
    description: "List files of a component",
    handler: handleList,
  });

  registerCommand({
    entity: "file",
    action: "create",
    description: "Create a new file",
    handler: handleCreate,
  });

  registerCommand({
    entity: "file",
    action: "update",
    description: "Update a file",
    handler: handleUpdate,
  });

  registerCommand({
    entity: "file",
    action: "delete",
    description: "Delete a file",
    handler: handleDelete,
  });
}
