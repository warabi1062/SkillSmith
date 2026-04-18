// コマンドのグローバルオプション
export interface GlobalOptions {
  json: boolean; // --json フラグ
  help: boolean; // --help フラグ
  version: boolean; // --version フラグ
}

// コマンドハンドラに渡されるコンテキスト
export interface CommandContext {
  entity: string;
  action: string;
  args: string[]; // 残余引数
  options: GlobalOptions;
  // コマンド固有オプションは args に含まれる残余引数として渡される。
  // 各コマンドハンドラが自身で util.parseArgs() を使い、
  // args からコマンド固有オプションをパースする責務を持つ。
  // これにより router はグローバルオプションのみ管理し、
  // コマンド固有の知識を持たない設計を維持する。
}

// コマンドハンドラの型
export type CommandHandler = (ctx: CommandContext) => Promise<number>;

// コマンド定義
export interface CommandDefinition {
  entity: string;
  action: string;
  description: string;
  handler: CommandHandler;
}
