// marketplaces ディレクトリを監視して、変更があれば SSE でブラウザに通知するモジュール。
// ローダー側のキャッシュは jiti の moduleCache: false で常時無効化されているため、
// クライアントが loader を再実行するだけで最新の plugin.ts / marketplace.ts が読み込まれる。

import type { Express, Request, Response } from "express";
import chokidar, { type FSWatcher } from "chokidar";

// /api/events に接続中の SSE クライアント
type SseClient = Response;

// ファイル変更通知のデバウンス時間（複数イベントが連続して来たときに1回にまとめる）
const DEBOUNCE_MS = 50;

// 中継サーバー越しの接続維持のため定期的に送るコメント
const PING_INTERVAL_MS = 15_000;

export function attachMarketplaceWatch(
  app: Express,
  marketplacesDir: string,
): () => Promise<void> {
  const clients = new Set<SseClient>();
  let debounceTimer: NodeJS.Timeout | null = null;

  // SSE エンドポイント: ブラウザは EventSource("/api/events") で接続する
  app.get("/api/events", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // リバプロでのバッファリングを抑止
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    // 初期コメント行: クライアントが接続を確立できたことを判別しやすくする
    res.write(": connected\n\n");

    clients.add(res);

    const ping = setInterval(() => {
      res.write(": ping\n\n");
    }, PING_INTERVAL_MS);

    req.on("close", () => {
      clearInterval(ping);
      clients.delete(res);
      res.end();
    });
  });

  const broadcast = (): void => {
    const payload = `event: marketplaces-changed\ndata: ${Date.now()}\n\n`;
    for (const client of clients) {
      client.write(payload);
    }
  };

  const scheduleBroadcast = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      broadcast();
    }, DEBOUNCE_MS);
  };

  // chokidar v4: glob は使わず marketplacesDir をそのまま root として再帰監視する
  const watcher: FSWatcher = chokidar.watch(marketplacesDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });
  watcher.on("add", scheduleBroadcast);
  watcher.on("change", scheduleBroadcast);
  watcher.on("unlink", scheduleBroadcast);
  watcher.on("addDir", scheduleBroadcast);
  watcher.on("unlinkDir", scheduleBroadcast);

  return async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    await watcher.close();
    for (const client of clients) {
      client.end();
    }
    clients.clear();
  };
}
