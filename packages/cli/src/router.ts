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

// グローバルオプションの名前セット
const GLOBAL_OPTION_NAMES = new Set(["json", "help", "version"]);

// process.argv からグローバルオプションと positional 引数をパースする
export function parseGlobalArgs(argv: string[]): {
  options: GlobalOptions;
  positionals: string[];
  rest: string[];
} {
  // process.argv の先頭 2 要素（node パスとスクリプトパス）を除いた引数を受け取る想定
  const { values, tokens } = parseArgs({
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
    // トークン情報を取得して未知オプションも rest に含める
    tokens: true,
  });

  const globalOptions: GlobalOptions = {
    json: values.json as boolean,
    help: values.help as boolean,
    version: values.version as boolean,
  };

  // トークン列から positional を抽出
  const positionalTokens = tokens!.filter((t) => t.kind === "positional");
  const positionals = positionalTokens.map((t) => t.value);

  // entity/action（先頭2つの positional）以降のトークンを rest に再構成する。
  // positional の 3 番目以降と、グローバルオプション以外のオプショントークンを含める。
  let entityActionCount = 0;
  const rest: string[] = [];

  for (const token of tokens!) {
    if (token.kind === "positional") {
      entityActionCount++;
      if (entityActionCount > 2) {
        // entity/action 以降の positional は rest に含める
        rest.push(token.value);
      }
    } else if (
      token.kind === "option" &&
      !GLOBAL_OPTION_NAMES.has(token.name)
    ) {
      // コマンド固有の未知オプションを rest に再構成する
      if (
        "inlineValue" in token &&
        token.inlineValue &&
        token.value !== undefined
      ) {
        // --name=value 形式
        rest.push(`${token.rawName}=${token.value}`);
      } else if (token.value !== undefined) {
        // --name value 形式
        rest.push(token.rawName, token.value);
      } else {
        // --flag 形式（boolean）
        rest.push(token.rawName);
      }
    }
  }

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

  // 5. action 未入力時: action 省略登録コマンドを優先して突合する
  if (!action) {
    const matchedEntityOnly = commands.find(
      (cmd) => cmd.entity === entity && cmd.action === undefined,
    );
    if (matchedEntityOnly) {
      const ctx: CommandContext = {
        entity,
        action: "",
        args: rest,
        options,
      };
      return matchedEntityOnly.handler(ctx);
    }

    // 6. entity のみ（action なし）: entity ヘルプを表示してエラー
    write(`${formatEntityHelp(entity, commands)}\n`);
    return 1;
  }

  // 7. entity + action の一致を検索
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
  // action 省略コマンドが登録されていても追加 positional（`web foo` 等）は unknown 扱いにする。
  // 現状は追加 positional を受け付けないため、誤入力時のユーザー誘導を優先する。
  write(`Unknown command: ${entity} ${action}\n\n`);
  write(`${formatGeneralHelp(commands)}\n`);
  return 1;
}
