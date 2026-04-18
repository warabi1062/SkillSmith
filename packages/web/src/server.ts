// viewer の起動用プログラマブル API。
// CLI や外部スクリプトから import して、React Router v7 のプロダクションビルドを
// Express ベースで起動するためのエントリポイント。

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";

export interface StartOptions {
  // marketplaces/ を解決するルートディレクトリ
  cwd: string;
  // 省略時は PORT env → デフォルト 3000
  port?: number;
  // 省略時は HOST env → 未設定なら全インターフェイス
  host?: string;
}

// env 注入ロジックを純粋関数として切り出し、テストしやすくする
export function resolveMarketplacesDir(cwd: string): string {
  return path.join(cwd, "marketplaces");
}

export async function start(options: StartOptions): Promise<void> {
  // 1. env 注入（build モジュールの import より前に実施する必要がある）
  process.env.SKILLSMITH_MARKETPLACES_DIR = resolveMarketplacesDir(options.cwd);

  // 2. build module と build ディレクトリのパスを解決する
  //    dist/server.js からの相対で ../build/server/index.js を指す。
  //    publish 時は @warabi1062/skillsmith-viewer/dist/server.js と
  //    @warabi1062/skillsmith-viewer/build/ が同じパッケージ内に同梱される。
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const packageRoot = path.resolve(__dirname, "..");
  const buildPath = path.join(packageRoot, "build", "server", "index.js");
  const assetsBuildDirectory = path.join(packageRoot, "build", "client");

  // 3. build を動的 import（env 注入済みの状態で実行される）
  const buildModule = await import(buildPath);

  // 4. Express アプリ構築（@react-router/serve の cli.js と等価な薄いラッパー）
  const app = express();
  app.disable("x-powered-by");
  app.use(compression());
  app.use(
    "/assets",
    express.static(path.join(assetsBuildDirectory, "assets"), {
      immutable: true,
      maxAge: "1y",
    }),
  );
  app.use(express.static(assetsBuildDirectory, { maxAge: "1h" }));
  app.use(morgan("tiny"));
  app.all(
    "*",
    createRequestHandler({ build: buildModule, mode: process.env.NODE_ENV }),
  );

  // 5. listen。PORT env の不正値（"abc" → NaN、"" → 0）は 3000 にフォールバック。
  //    `??` と `||` の括弧なし混在は ES2020 仕様で SyntaxError になるため段階的に評価する。
  const envPort = Number(process.env.PORT);
  const port =
    options.port ?? (Number.isFinite(envPort) && envPort > 0 ? envPort : 3000);
  const host = options.host ?? process.env.HOST;
  const onListen = () => {
    console.log(`[skillsmith-viewer] http://localhost:${port}`);
  };
  if (host) {
    app.listen(port, host, onListen);
  } else {
    app.listen(port, onListen);
  }
}
