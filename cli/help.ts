import type { CommandDefinition } from "./types";

// パッケージバージョンを取得するヘルパー
export function getVersion(): string {
  // CLI 実行時に package.json から取得するが、テスト時は固定値を返す
  // 動的 import は避け、呼び出し側から注入可能にする
  return "1.0.0";
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
    lines.push("Commands:");
    for (const [entity, cmds] of grouped) {
      for (const cmd of cmds) {
        lines.push(`  ${entity} ${cmd.action}    ${cmd.description}`);
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

  for (const cmd of entityCommands) {
    lines.push(`  ${cmd.action}    ${cmd.description}`);
  }

  return lines.join("\n");
}
