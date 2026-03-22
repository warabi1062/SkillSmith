import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CommandDefinition } from "./types";

// パッケージバージョンを package.json から取得するヘルパー
export function getVersion(): string {
  const dir = typeof __dirname !== "undefined"
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
    const maxWidth = Math.max(
      ...commands.map((cmd) => `${cmd.entity} ${cmd.action}`.length),
    );
    lines.push("Commands:");
    for (const [entity, cmds] of grouped) {
      for (const cmd of cmds) {
        const name = `${entity} ${cmd.action}`;
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

  const lines = [
    `Usage: skillsmith ${entity} <action> [options]`,
    "",
    "Actions:",
  ];

  // アクション名の最大幅を計算して列を揃える
  const maxWidth = Math.max(
    ...entityCommands.map((cmd) => cmd.action.length),
  );
  for (const cmd of entityCommands) {
    lines.push(`  ${cmd.action.padEnd(maxWidth)}    ${cmd.description}`);
  }

  return lines.join("\n");
}
