#!/usr/bin/env node

import { registerComponentCommands } from "./commands/component";
import { registerPluginCommands } from "./commands/plugin";
import { route } from "./router";

// CLI エントリーポイント
async function main(): Promise<void> {
  try {
    // コマンド登録
    registerPluginCommands();
    registerComponentCommands();

    // process.argv の先頭 2 要素（node パスとスクリプトパス）を除外
    const exitCode = await route(process.argv.slice(2));
    process.exit(exitCode);
  } catch (error) {
    // 未キャッチ例外のハンドリング
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    process.stderr.write(`Fatal: ${message}\n`);
    process.exit(1);
  }
}

main();
