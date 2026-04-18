import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// buildPath は server.ts の fileURLToPath(import.meta.url) 起点で固定されるため、
// テストファイル側でも同じ起点から算出してスタブ対象のパスを決める
// （server.ts の __dirname は packages/web/src、そこから ../build/server/index.js）
const testDir = path.dirname(fileURLToPath(import.meta.url));
const serverTsDir = path.resolve(testDir, "..");
const buildPath = path.join(
  path.resolve(serverTsDir, ".."),
  "build",
  "server",
  "index.js",
);

// build モジュールが実在しなくてもテストが走るようダミーをスタブする
vi.doMock(buildPath, () => ({ default: {}, entry: { module: {} } }));

// @react-router/express は createRequestHandler が関数を返す想定だけをモック
vi.mock("@react-router/express", () => ({
  createRequestHandler: vi.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => {
      next();
    },
  ),
}));

describe("resolveMarketplacesDir", () => {
  it("cwd に marketplaces を join したパスを返す", async () => {
    const { resolveMarketplacesDir } = await import("../server");
    expect(resolveMarketplacesDir("/tmp/project")).toBe(
      path.join("/tmp/project", "marketplaces"),
    );
  });
});

describe("start", () => {
  const originalMarketplacesDir = process.env.SKILLSMITH_MARKETPLACES_DIR;
  const originalPort = process.env.PORT;
  const originalHost = process.env.HOST;

  beforeEach(() => {
    // 各テストの前に env を初期化する（他テストの汚染防止）
    delete process.env.SKILLSMITH_MARKETPLACES_DIR;
    delete process.env.PORT;
    delete process.env.HOST;
  });

  afterEach(() => {
    // 元の env 値を復元する
    if (originalMarketplacesDir === undefined) {
      delete process.env.SKILLSMITH_MARKETPLACES_DIR;
    } else {
      process.env.SKILLSMITH_MARKETPLACES_DIR = originalMarketplacesDir;
    }
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
    if (originalHost === undefined) {
      delete process.env.HOST;
    } else {
      process.env.HOST = originalHost;
    }
    vi.restoreAllMocks();
  });

  it("SKILLSMITH_MARKETPLACES_DIR を resolveMarketplacesDir(cwd) の結果で上書きする", async () => {
    const { start } = await import("../server");
    const { default: express } = await import("express");
    // app.listen を差し替え、実際にポートを開かないようにする
    const listenSpy = vi
      .spyOn(express.application, "listen")
      // biome-ignore lint/suspicious/noExplicitAny: listen のオーバーロードが多く any で吸収するのが実用的
      .mockImplementation(function (this: unknown, ...args: any[]) {
        const cb = args[args.length - 1];
        if (typeof cb === "function") cb();
        return { close: vi.fn() } as unknown as ReturnType<
          typeof express.application.listen
        >;
      });

    await start({ cwd: "/tmp/test-cwd" });

    expect(process.env.SKILLSMITH_MARKETPLACES_DIR).toBe(
      path.join("/tmp/test-cwd", "marketplaces"),
    );
    expect(listenSpy).toHaveBeenCalled();
  });

  it("port / host オプションが app.listen に正しく渡される", async () => {
    const { start } = await import("../server");
    const { default: express } = await import("express");
    const listenSpy = vi
      .spyOn(express.application, "listen")
      // biome-ignore lint/suspicious/noExplicitAny: listen のオーバーロードが多く any で吸収するのが実用的
      .mockImplementation(function (this: unknown, ...args: any[]) {
        const cb = args[args.length - 1];
        if (typeof cb === "function") cb();
        return { close: vi.fn() } as unknown as ReturnType<
          typeof express.application.listen
        >;
      });

    await start({ cwd: "/tmp/test-cwd", port: 4321, host: "127.0.0.1" });

    expect(listenSpy).toHaveBeenCalledTimes(1);
    // listen のオーバーロードが (port, host, callback) と (port, callback) で型が揺れるため
    // 引数列を unknown[] として取り出して index アクセスする
    const callArgs = listenSpy.mock.calls[0] as unknown as unknown[];
    // host 指定時は (port, host, callback) の 3 引数で呼ばれる
    expect(callArgs[0]).toBe(4321);
    expect(callArgs[1]).toBe("127.0.0.1");
    expect(typeof callArgs[2]).toBe("function");
  });
});
