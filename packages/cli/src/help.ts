import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CommandDefinition } from "./types";

// ビルド時に tsup の define で置換されるバージョン文字列。
// 開発時（tsx 直接実行）は未定義なので package.json からフォールバックして読む。
declare const __SKILLSMITH_VERSION__: string | undefined;

// パッケージバージョンを取得するヘルパー
export function getVersion(): string {
  if (typeof __SKILLSMITH_VERSION__ !== "undefined") {
    return __SKILLSMITH_VERSION__;
  }
  const dir =
    typeof __dirname !== "undefined"
      ? __dirname
      : fileURLToPath(new URL(".", import.meta.url));
  const pkgPath = resolve(dir, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version;
}

// 全体ヘルプを生成する
export function formatGeneralHelp(commands: CommandDefinition[]): string {
  const lines = [
    "Usage: skillsmith <entity> <action> [options]",
    "",
    "Options:",
    "  --help       ヘルプを表示",
    "  --version    バージョンを表示",
    "  --json       JSON 形式で出力",
    "",
  ];

  // entity ごとにコマンドをグループ化
  const grouped = new Map<string, CommandDefinition[]>();
  for (const cmd of commands) {
    const existing = grouped.get(cmd.entity) ?? [];
    existing.push(cmd);
    grouped.set(cmd.entity, existing);
  }

  if (grouped.size > 0) {
    // コマンド名の最大幅を計算して列を揃える
    // action 省略コマンドは `entity` のみ、それ以外は `entity action` として扱う
    const formatName = (cmd: CommandDefinition): string =>
      cmd.action ? `${cmd.entity} ${cmd.action}` : cmd.entity;
    const maxWidth = Math.max(...commands.map((cmd) => formatName(cmd).length));
    lines.push("Commands:");
    for (const [, cmds] of grouped) {
      for (const cmd of cmds) {
        const name = formatName(cmd);
        lines.push(`  ${name.padEnd(maxWidth)}    ${cmd.description}`);
      }
    }
  } else {
    lines.push("Commands:");
    lines.push("  (コマンドが登録されていません)");
  }

  return lines.join("\n");
}

// entity 別ヘルプを生成する
export function formatEntityHelp(
  entity: string,
  commands: CommandDefinition[],
): string {
  const entityCommands = commands.filter((cmd) => cmd.entity === entity);

  if (entityCommands.length === 0) {
    return `Unknown entity: ${entity}\n\nRun 'skillsmith --help' for usage.`;
  }

  // action 省略コマンドのみ（`skillsmith web` 形式）と action 必須コマンドで Usage 行を分ける
  const actionCommands = entityCommands.filter(
    (cmd) => cmd.action !== undefined,
  );
  const entityOnlyCommand = entityCommands.find(
    (cmd) => cmd.action === undefined,
  );

  const lines: string[] = [];
  if (actionCommands.length > 0) {
    lines.push(`Usage: skillsmith ${entity} <action> [options]`);
  } else {
    lines.push(`Usage: skillsmith ${entity} [options]`);
  }

  if (entityOnlyCommand) {
    lines.push("", entityOnlyCommand.description);
  }

  if (actionCommands.length > 0) {
    lines.push("", "Actions:");
    // action 必須コマンドのみテーブルに並べる（action が undefined のものは Usage 行で説明済み）
    const maxWidth = Math.max(
      ...actionCommands.map((cmd) => (cmd.action ?? "").length),
    );
    for (const cmd of actionCommands) {
      const actionName = cmd.action ?? "";
      lines.push(`  ${actionName.padEnd(maxWidth)}    ${cmd.description}`);
    }
  }

  return lines.join("\n");
}
