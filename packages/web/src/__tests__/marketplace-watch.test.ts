import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { start, type StartedServer } from "../server";

// 一時ディレクトリに最小の marketplaces 構造を作って attachMarketplaceWatch の挙動を検証する。
// ファイル変更 → SSE 受信 → 切断 → close の一連を確認する。

let tmpRoot: string;
let marketplacesDir: string;
let server: StartedServer;

async function setupMarketplace(): Promise<void> {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skillsmith-watch-"));
  marketplacesDir = path.join(tmpRoot, "marketplaces");
  const pluginDir = path.join(marketplacesDir, "demo", "plugins", "p1");
  await fs.mkdir(pluginDir, { recursive: true });
  await fs.writeFile(
    path.join(pluginDir, "plugin.ts"),
    `const plugin = { name: "p1", description: "before", skills: [] };\nexport default plugin;\n`,
    "utf-8",
  );
}

// SSE のレスポンスを 1 イベント分読む（"event: <name>\ndata: <data>\n\n" 単位）
async function readEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<{
  event: string;
  data: string;
}> {
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) throw new Error("SSE stream closed before event arrived");
    buf += decoder.decode(value, { stream: true });
    const sep = buf.indexOf("\n\n");
    if (sep === -1) continue;
    const block = buf.slice(0, sep);
    buf = buf.slice(sep + 2);
    // コメント行（": ..."）はスキップして次のブロックを待つ
    if (block.startsWith(":")) continue;
    let event = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice("event:".length).trim();
      else if (line.startsWith("data:"))
        data = line.slice("data:".length).trim();
    }
    return { event, data };
  }
}

describe("attachMarketplaceWatch", () => {
  beforeEach(async () => {
    await setupMarketplace();
    process.env.SKILLSMITH_DEV_API_ONLY = "1";
    server = await start({ marketplacesDir, port: 0 });
  });

  afterEach(async () => {
    await server.close();
    delete process.env.SKILLSMITH_DEV_API_ONLY;
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it("plugin.ts を変更すると /api/events に marketplaces-changed が届く", async () => {
    const ac = new AbortController();
    const res = await fetch(`http://127.0.0.1:${server.port}/api/events`, {
      signal: ac.signal,
    });
    expect(res.ok).toBe(true);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const reader = res.body!.getReader();

    // 監視が落ち着くのを少し待ってからファイル変更を起こす
    await new Promise((r) => setTimeout(r, 150));
    const pluginTs = path.join(
      marketplacesDir,
      "demo",
      "plugins",
      "p1",
      "plugin.ts",
    );
    await fs.writeFile(
      pluginTs,
      `const plugin = { name: "p1", description: "after", skills: [] };\nexport default plugin;\n`,
      "utf-8",
    );

    const event = await readEvent(reader);
    expect(event.event).toBe("marketplaces-changed");
    expect(event.data).toMatch(/^\d+$/);

    ac.abort();
  });

  it("close 後は新たな /api/events 接続もサーバー停止で失敗する", async () => {
    await server.close();
    // close 後はそもそも listen していないので fetch がエラー
    await expect(
      fetch(`http://127.0.0.1:${server.port}/api/events`),
    ).rejects.toThrow();
    // afterEach の再 close を呼ばれても落ちないように差し替える（dummy）
    server = {
      port: server.port,
      close: async () => {
        /* already closed */
      },
    };
  });
});
