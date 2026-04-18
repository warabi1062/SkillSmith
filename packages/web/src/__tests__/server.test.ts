import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { start, type StartedServer } from "../server";

// packages/web 直下の marketplaces/example を fixture として利用する
const WEB_ROOT = path.resolve(__dirname, "../..");
const EXAMPLE_CWD = WEB_ROOT;

// 壊れた plugin.ts を含む marketplace を作るための一時 cwd を準備する
async function setupBrokenMarketplace(): Promise<string> {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "skillsmith-test-"));
  const pluginDir = path.join(
    tmpRoot,
    "marketplaces",
    "broken",
    "plugins",
    "bad",
  );
  await fs.mkdir(pluginDir, { recursive: true });
  // default export が無い不正な plugin.ts（loader は例外を throw する）
  await fs.writeFile(
    path.join(pluginDir, "plugin.ts"),
    "export const notDefault = {};\n",
    "utf-8",
  );
  // 404 用に存在しないプラグイン名も同じ marketplace 内で検証する
  return tmpRoot;
}

// SPA fallback 用のダミー dist/spa ディレクトリを作る
async function setupSpaDir(): Promise<string> {
  const tmpSpa = await fs.mkdtemp(path.join(os.tmpdir(), "skillsmith-spa-"));
  await fs.writeFile(
    path.join(tmpSpa, "index.html"),
    "<!doctype html><html><body>SPA</body></html>",
    "utf-8",
  );
  return tmpSpa;
}

describe("src/server.ts (start)", () => {
  describe("API のみモード（SKILLSMITH_DEV_API_ONLY=1）", () => {
    let server: StartedServer;
    const originalApiOnly = process.env.SKILLSMITH_DEV_API_ONLY;

    beforeAll(async () => {
      process.env.SKILLSMITH_DEV_API_ONLY = "1";
      server = await start({ cwd: EXAMPLE_CWD, port: 0 });
    });

    afterAll(async () => {
      await server.close();
      if (originalApiOnly === undefined) {
        delete process.env.SKILLSMITH_DEV_API_ONLY;
      } else {
        process.env.SKILLSMITH_DEV_API_ONLY = originalApiOnly;
      }
    });

    it("GET /api/marketplaces は MarketplaceMeta[] を返す", async () => {
      const res = await fetch(
        `http://127.0.0.1:${server.port}/api/marketplaces`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Array<{
        dirName: string;
        pluginCount: number;
      }>;
      expect(Array.isArray(body)).toBe(true);
      const example = body.find((m) => m.dirName === "example");
      expect(example).toBeDefined();
      expect(example?.pluginCount).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/marketplaces/:id は plugins を返す", async () => {
      const res = await fetch(
        `http://127.0.0.1:${server.port}/api/marketplaces/example`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        marketplaceId: string;
        plugins: Array<{ dirName: string; name: string }>;
      };
      expect(body.marketplaceId).toBe("example");
      expect(body.plugins.length).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/marketplaces/:id/plugins/:name は plugin 詳細を返す", async () => {
      const listRes = await fetch(
        `http://127.0.0.1:${server.port}/api/marketplaces/example`,
      );
      const list = (await listRes.json()) as {
        plugins: Array<{ dirName: string }>;
      };
      const target = list.plugins[0]?.dirName;
      expect(target).toBeDefined();

      const res = await fetch(
        `http://127.0.0.1:${server.port}/api/marketplaces/example/plugins/${target}`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        plugin: { name: string; skills: unknown[] };
        pluginId: string;
        marketplaceId: string;
      };
      expect(body.marketplaceId).toBe("example");
      expect(body.pluginId).toBe(target);
      expect(typeof body.plugin.name).toBe("string");
      expect(Array.isArray(body.plugin.skills)).toBe(true);
    });

    it("存在しないプラグインは 404 を返す", async () => {
      const res = await fetch(
        `http://127.0.0.1:${server.port}/api/marketplaces/example/plugins/__missing__`,
      );
      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Plugin not found");
    });

    it("marketplace id にパストラバーサルを含むリクエストは 400 を返す", async () => {
      // Express 5 はパスパラメータをデコードするので、%2F や生の / は別扱いになる
      // %2F エンコード版: req.params.id に "../../etc" が入るケース
      const encoded = await fetch(
        `http://127.0.0.1:${server.port}/api/marketplaces/..%2F..%2Fetc`,
      );
      expect(encoded.status).toBe(400);
      const encodedBody = (await encoded.json()) as { error: string };
      expect(encodedBody.error).toBe("Invalid marketplace id");
    });

    it("plugin 名にパストラバーサルを含むリクエストは 400 を返す", async () => {
      const res = await fetch(
        `http://127.0.0.1:${server.port}/api/marketplaces/example/plugins/..%2F..%2Fetc`,
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Invalid plugin path");
    });
  });

  describe("壊れた plugin.ts", () => {
    let server: StartedServer;
    let brokenRoot: string;
    const originalApiOnly = process.env.SKILLSMITH_DEV_API_ONLY;

    beforeAll(async () => {
      process.env.SKILLSMITH_DEV_API_ONLY = "1";
      brokenRoot = await setupBrokenMarketplace();
      server = await start({ cwd: brokenRoot, port: 0 });
    });

    afterAll(async () => {
      await server.close();
      await fs.rm(brokenRoot, { recursive: true, force: true });
      if (originalApiOnly === undefined) {
        delete process.env.SKILLSMITH_DEV_API_ONLY;
      } else {
        process.env.SKILLSMITH_DEV_API_ONLY = originalApiOnly;
      }
    });

    it("plugin.ts が不正な場合は 500 を返す（ENOENT ではなくパース/型エラー経路）", async () => {
      const res = await fetch(
        `http://127.0.0.1:${server.port}/api/marketplaces/broken/plugins/bad`,
      );
      expect(res.status).toBe(500);
    });
  });

  describe("SPA fallback", () => {
    let server: StartedServer;
    let spaDir: string;

    beforeAll(async () => {
      spaDir = await setupSpaDir();
      server = await start({ cwd: EXAMPLE_CWD, port: 0, spaDir });
    });

    afterAll(async () => {
      await server.close();
      await fs.rm(spaDir, { recursive: true, force: true });
    });

    it("ネスト URL 直アクセスで index.html を返す（Express 5 '/{*splat}' の回帰防止）", async () => {
      const res = await fetch(
        `http://127.0.0.1:${server.port}/marketplaces/example/plugins/hello-world`,
      );
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("SPA");
    });

    it("ルートパスでも index.html を返す", async () => {
      const res = await fetch(`http://127.0.0.1:${server.port}/`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("SPA");
    });

    it("JSON API は SPA fallback より優先される", async () => {
      const res = await fetch(
        `http://127.0.0.1:${server.port}/api/marketplaces`,
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
    });
  });
});
