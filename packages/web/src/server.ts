import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadAllMarketplaceMeta,
  loadAllPluginMetaInMarketplace,
  loadPluginDefinition,
  getMarketplacesBaseDir,
} from "@warabi1062/skillsmith-core/loader";

// start({ cwd, port? }) で HTTP サーバーを起動するプログラマブル API
export interface StartOptions {
  cwd: string;
  port?: number;
}

export interface StartedServer {
  port: number;
  close: () => Promise<void>;
}

// エラーの種類を判定する（ENOENT または loader の plugin.ts 不在メッセージ）
function isPluginNotFound(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOENT") return true;
  const msg = err instanceof Error ? err.message : String(err);
  return msg.startsWith("plugin.ts が見つかりません");
}

export async function start(opts: StartOptions): Promise<StartedServer> {
  // cwd 注入: core/loader は SKILLSMITH_MARKETPLACES_DIR を参照するので、
  // 引数 cwd からフルパスを組み立てて上書きする（既存 scripts/dev.ts の慣習に準拠）
  process.env.SKILLSMITH_MARKETPLACES_DIR = path.resolve(
    opts.cwd,
    "marketplaces",
  );

  const port = opts.port ?? Number(process.env.PORT ?? 5173);
  const app = express();

  // JSON API はファイル配信より先に定義する
  app.get("/api/marketplaces", async (_req, res, next) => {
    try {
      const data = await loadAllMarketplaceMeta();
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/marketplaces/:id", async (req, res, next) => {
    try {
      const dir = path.join(getMarketplacesBaseDir(), req.params.id);
      const plugins = await loadAllPluginMetaInMarketplace(dir);
      res.json({ marketplaceId: req.params.id, plugins });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/marketplaces/:id/plugins/:name", async (req, res, next) => {
    const dir = path.join(
      getMarketplacesBaseDir(),
      req.params.id,
      "plugins",
      req.params.name,
    );
    try {
      const plugin = await loadPluginDefinition(dir);
      res.json({
        plugin,
        pluginId: req.params.name,
        marketplaceId: req.params.id,
      });
    } catch (err) {
      // plugin.ts 不在は 404、それ以外（jiti トランスパイル失敗、不正な PluginDefinition 等）は 500
      if (isPluginNotFound(err)) {
        res.status(404).json({ error: "Plugin not found" });
        return;
      }
      next(err);
    }
  });

  // dev 時は Vite が SPA を配信するので API のみ提供する
  if (!process.env.SKILLSMITH_DEV_API_ONLY) {
    // dist/server.js からの相対で dist/spa/ を参照
    const distDir = fileURLToPath(new URL("./spa", import.meta.url));
    app.use(express.static(distDir));
    // Express 5: 無名ワイルドカード不可。named splat + braces でルートパスを含めて一致させる
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  return await new Promise<StartedServer>((resolve) => {
    const server = app.listen(port, () => {
      const addr = server.address();
      const actualPort =
        typeof addr === "object" && addr !== null ? addr.port : port;
      resolve({
        port: actualPort,
        close: () =>
          new Promise<void>((r, rej) => {
            server.close((err) => (err ? rej(err) : r()));
          }),
      });
    });
  });
}
