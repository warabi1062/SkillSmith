import { parseArgs } from "node:util";
import { formatEntityHelp, formatGeneralHelp, getVersion } from "./help";
import type { CommandContext, CommandDefinition, GlobalOptions } from "./types";

// コマンドレジストリ
const commands: CommandDefinition[] = [];

// コマンドを登録する
export function registerCommand(def: CommandDefinition): void {
  commands.push(def);
}

// 登録済みコマンド一覧を取得する（テスト用）
export function getRegisteredCommands(): ReadonlyArray<CommandDefinition> {
  return commands;
}

// 登録済みコマンドをすべてクリアする（テスト用）
export function clearCommands(): void {
  commands.length = 0;
}

// process.argv からグローバルオプションと positional 引数をパースする
export function parseGlobalArgs(argv: string[]): {
  options: GlobalOptions;
  positionals: string[];
  rest: string[];
} {
  // process.argv の先頭 2 要素（node パスとスクリプトパス）を除いた引数を受け取る想定
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
      version: { type: "boolean", default: false },
    },
    // entity, action を positional として取得
    allowPositionals: true,
    // コマンド固有のオプションを許容する
    strict: false,
  });

  const globalOptions: GlobalOptions = {
    json: values.json as boolean,
    help: values.help as boolean,
    version: values.version as boolean,
  };

  // positionals の最初の 2 つが entity/action、残りは rest
  const rest = positionals.slice(2);

  // TODO: コマンド固有の未知オプション（--name value, --name=value 等）の抽出は
  // parseArgs の tokens オプションを使って正確に実装する（後続チケットで対応）。
  // 現段階では positional の残余引数のみを rest に含める。

  return {
    options: globalOptions,
    positionals,
    rest,
  };
}

// メインルーティング。argv は process.argv.slice(2) を想定
export async function route(
  argv: string[],
  write: (s: string) => void = (s) => process.stdout.write(s),
): Promise<number> {
  const { options, positionals, rest } = parseGlobalArgs(argv);

  const entity = positionals[0] ?? "";
  const action = positionals[1] ?? "";

  // 1. --version フラグ: 最優先
  if (options.version) {
    write(`${getVersion()}\n`);
    return 0;
  }

  // 2. --help フラグ（entity なし）: 全体ヘルプ
  if (options.help && !entity) {
    write(`${formatGeneralHelp(commands)}\n`);
    return 0;
  }

  // 3. --help フラグ（entity あり）: entity 別ヘルプ
  if (options.help && entity) {
    write(`${formatEntityHelp(entity, commands)}\n`);
    return 0;
  }

  // 4. entity がない場合: 全体ヘルプを表示してエラー
  if (!entity) {
    write(`${formatGeneralHelp(commands)}\n`);
    return 1;
  }

  // 5. entity + action の一致を検索
  if (action) {
    const matched = commands.find(
      (cmd) => cmd.entity === entity && cmd.action === action,
    );
    if (matched) {
      const ctx: CommandContext = {
        entity,
        action,
        args: rest,
        options,
      };
      return matched.handler(ctx);
    }

    // 一致しない: エラーメッセージ + 全体ヘルプ
    write(`Unknown command: ${entity} ${action}\n\n`);
    write(`${formatGeneralHelp(commands)}\n`);
    return 1;
  }

  // 6. entity のみ（action なし）: entity ヘルプを表示してエラー
  write(`${formatEntityHelp(entity, commands)}\n`);
  return 1;
}
