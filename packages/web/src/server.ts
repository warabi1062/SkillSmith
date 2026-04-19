import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadAllMarketplaceMeta,
  loadAllPluginMetaInMarketplace,
  loadPluginDefinition,
  getMarketplacesBaseDir,
} from "@warabi1062/skillsmith-core/loader";

// start({ marketplacesDir, port?, host?, spaDir? }) で HTTP サーバーを起動するプログラマブル API
export interface StartOptions {
  // 閲覧対象の marketplaces ディレクトリ（呼び出し側で解決済みのパスを受け取る）
  marketplacesDir: string;
  port?: number;
  // bind address の既定は 127.0.0.1。LAN 公開したい場合のみ "0.0.0.0" 等を明示
  host?: string;
  // SPA 配信ディレクトリの上書き（指定時は dist/spa より優先）。テスト用途が主
  spaDir?: string;
}

export interface StartedServer {
  port: number;
  close: () => Promise<void>;
}

// marketplace / plugin のディレクトリ名として許可する文字の集合
// 英数・ドット・アンダースコア・ハイフンのみ。path separator や ".." を完全に排除する
const SAFE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

function isSafeName(value: string): boolean {
  // ".." 単体や "." 単体も禁止（相対パス解釈を一切許さない）
  return SAFE_NAME_PATTERN.test(value) && value !== "." && value !== "..";
}

// エラーの種類を判定する（ENOENT または loader の plugin.ts 不在メッセージ）
function isPluginNotFound(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOENT") return true;
  const msg = err instanceof Error ? err.message : String(err);
  return msg.startsWith("plugin.ts が見つかりません");
}

export async function start(opts: StartOptions): Promise<StartedServer> {
  // core/loader は SKILLSMITH_MARKETPLACES_DIR を参照するため、受け取った marketplacesDir を
  // 絶対パスに正規化して上書きする。パス組み立ては呼び出し側（CLI）が責務として持つ。
  process.env.SKILLSMITH_MARKETPLACES_DIR = path.resolve(opts.marketplacesDir);

  const port = opts.port ?? Number(process.env.PORT ?? 5173);
  // 既定は localhost（loopback）にバインドし、LAN 公開したい場合のみ host を明示する
  const host = opts.host ?? process.env.HOST ?? "127.0.0.1";
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
    // パストラバーサル対策: id は単純な名前のみ許可する
    if (!isSafeName(req.params.id)) {
      res.status(400).json({ error: "Invalid marketplace id" });
      return;
    }
    try {
      const base = getMarketplacesBaseDir();
      const dir = path.resolve(base, req.params.id);
      // 二重防御: 正規化後に必ず base の配下であることを確認する
      if (!dir.startsWith(path.resolve(base) + path.sep)) {
        res.status(400).json({ error: "Invalid marketplace id" });
        return;
      }
      const plugins = await loadAllPluginMetaInMarketplace(dir);
      res.json({ marketplaceId: req.params.id, plugins });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/marketplaces/:id/plugins/:name", async (req, res, next) => {
    // パストラバーサル対策: id / name ともに単純な名前のみ許可する
    if (!isSafeName(req.params.id) || !isSafeName(req.params.name)) {
      res.status(400).json({ error: "Invalid plugin path" });
      return;
    }
    const base = getMarketplacesBaseDir();
    const dir = path.resolve(base, req.params.id, "plugins", req.params.name);
    // 二重防御: 正規化後に必ず base の配下であることを確認する
    if (!dir.startsWith(path.resolve(base) + path.sep)) {
      res.status(400).json({ error: "Invalid plugin path" });
      return;
    }
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
    // 既定は dist/server.js からの相対で dist/spa/ を参照。opts.spaDir で上書き可
    const distDir =
      opts.spaDir ?? fileURLToPath(new URL("./spa", import.meta.url));
    app.use(express.static(distDir));
    // Express 5: 無名ワイルドカード不可。named splat + braces でルートパスを含めて一致させる
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  return await new Promise<StartedServer>((resolve) => {
    const server = app.listen(port, host, () => {
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
