import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCommands, route } from "../../router";

// viewer 読み込みを web-loader.ts に切り出しているため、そこを丸ごとモックして
// loadViewer の戻り値を差し替える。web.ts は通常の import で問題なく動作する。
vi.mock("../web-loader", () => ({
  VIEWER_PACKAGE_NAME: "@warabi1062/skillsmith-viewer",
  VIEWER_SERVER_MODULE: "@warabi1062/skillsmith-viewer/server",
  loadViewer: vi.fn(),
}));

import { registerWebCommand } from "../web";
import { loadViewer } from "../web-loader";

// テスト用のprocess.stdout/stderr出力キャプチャヘルパー
function captureProcessOutput(): {
  stdoutData: string[];
  stderrData: string[];
  cleanup: () => void;
} {
  const stdoutData: string[] = [];
  const stderrData: string[] = [];
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdoutData.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderrData.push(typeof chunk === "string" ? chunk : chunk.toString());
    return true;
  }) as typeof process.stderr.write;

  return {
    stdoutData,
    stderrData,
    cleanup: () => {
      process.stdout.write = origStdoutWrite;
      process.stderr.write = origStderrWrite;
    },
  };
}

// SIGINT/SIGTERM リスナーを test 間で持ち越さないためのクリーンアップ
function removeSignalListeners(): void {
  process.removeAllListeners("SIGINT");
  process.removeAllListeners("SIGTERM");
}

const noop = () => {};

describe("web コマンド", () => {
  beforeEach(() => {
    clearCommands();
    removeSignalListeners();
    registerWebCommand();
  });

  afterEach(() => {
    clearCommands();
    removeSignalListeners();
    vi.resetAllMocks();
  });

  it("viewer 解決成功: start を呼び SIGINT で close して exit 0", async () => {
    // Arrange
    const mockServer = {
      port: 5173,
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockStart = vi.fn().mockResolvedValue(mockServer);
    vi.mocked(loadViewer).mockResolvedValue({
      start: mockStart,
    } as unknown as Awaited<ReturnType<typeof loadViewer>>);
    const { cleanup } = captureProcessOutput();

    try {
      // Act: handler は SIGINT を受け取るまで解決しない。
      // route を Promise のまま保持し、listener 登録完了後に SIGINT を発火する。
      const routePromise = route(["web"], noop);
      // 動的 import / start() 完了まで複数 tick 待つ
      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setImmediate(r));
      process.emit("SIGINT");
      const exitCode = await routePromise;

      // Assert
      expect(exitCode).toBe(0);
      expect(mockStart).toHaveBeenCalledOnce();
      expect(mockStart).toHaveBeenCalledWith({ cwd: expect.any(String) });
      expect(mockServer.close).toHaveBeenCalledOnce();
    } finally {
      cleanup();
    }
  });

  it("ERR_MODULE_NOT_FOUND かつ viewer パッケージ名一致: インストール案内 + exit 1", async () => {
    // Arrange
    const err = Object.assign(
      new Error(
        "Cannot find package '@warabi1062/skillsmith-viewer' imported from ...",
      ),
      { code: "ERR_MODULE_NOT_FOUND" },
    );
    vi.mocked(loadViewer).mockRejectedValue(err);
    const { stderrData, cleanup } = captureProcessOutput();

    try {
      // Act
      const exitCode = await route(["web"], noop);

      // Assert
      expect(exitCode).toBe(1);
      const stderr = stderrData.join("");
      expect(stderr).toContain("@warabi1062/skillsmith-viewer");
      expect(stderr).toContain("pnpm add -D @warabi1062/skillsmith-viewer");
    } finally {
      cleanup();
    }
  });

  it("MODULE_NOT_FOUND（CJS 経路）かつ viewer 名一致: インストール案内 + exit 1", async () => {
    // Arrange
    const err = Object.assign(
      new Error("Cannot find module '@warabi1062/skillsmith-viewer/server'"),
      { code: "MODULE_NOT_FOUND" },
    );
    vi.mocked(loadViewer).mockRejectedValue(err);
    const { stderrData, cleanup } = captureProcessOutput();

    try {
      // Act
      const exitCode = await route(["web"], noop);

      // Assert
      expect(exitCode).toBe(1);
      expect(stderrData.join("")).toContain(
        "pnpm add -D @warabi1062/skillsmith-viewer",
      );
    } finally {
      cleanup();
    }
  });

  it("viewer 以外のモジュール名での MODULE_NOT_FOUND は再 throw する", async () => {
    // Arrange: code は module-not-found だが message の package 名が viewer と一致しないケース
    const err = Object.assign(
      new Error("Cannot find package 'express' imported from ..."),
      { code: "ERR_MODULE_NOT_FOUND" },
    );
    vi.mocked(loadViewer).mockRejectedValue(err);
    const { cleanup } = captureProcessOutput();

    try {
      // Act & Assert: viewer 未解決の誤判定を防いで Fatal 経路に委ねる
      await expect(route(["web"], noop)).rejects.toThrow(
        "Cannot find package 'express'",
      );
    } finally {
      cleanup();
    }
  });

  it("start() 実行中のエラーは再 throw する", async () => {
    // Arrange
    const startError = new Error("listen EADDRINUSE");
    vi.mocked(loadViewer).mockResolvedValue({
      start: vi.fn().mockRejectedValue(startError),
    } as unknown as Awaited<ReturnType<typeof loadViewer>>);
    const { cleanup } = captureProcessOutput();

    try {
      // Act & Assert
      await expect(route(["web"], noop)).rejects.toThrow("listen EADDRINUSE");
    } finally {
      cleanup();
    }
  });
});
