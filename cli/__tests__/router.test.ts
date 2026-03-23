import { afterEach, describe, expect, it, vi } from "vitest";
import { clearCommands, registerCommand, route } from "../router";

// テスト用の出力キャプチャヘルパー
function captureOutput(): { output: string[]; write: (s: string) => void } {
  const output: string[] = [];
  return {
    output,
    write: (s: string) => { output.push(s); },
  };
}

describe("route", () => {
  afterEach(() => {
    clearCommands();
  });

  describe("--version フラグ", () => {
    it("バージョンを表示して終了コード 0 を返す", async () => {
      // Arrange
      const { output, write } = captureOutput();

      // Act
      const exitCode = await route(["--version"], write);

      // Assert
      expect(exitCode).toBe(0);
      expect(output.join("")).toContain("1.0.0");
    });

    it("entity/action があっても --version が優先される", async () => {
      // Arrange
      const handler = vi.fn().mockResolvedValue(0);
      registerCommand({
        entity: "plugin",
        action: "list",
        description: "test",
        handler,
      });
      const { output, write } = captureOutput();

      // Act
      const exitCode = await route(["plugin", "list", "--version"], write);

      // Assert
      expect(exitCode).toBe(0);
      expect(handler).not.toHaveBeenCalled();
      expect(output.join("")).toContain("1.0.0");
    });
  });

  describe("--help フラグ", () => {
    it("entity なしで全体ヘルプを表示して終了コード 0 を返す", async () => {
      // Arrange
      const { output, write } = captureOutput();

      // Act
      const exitCode = await route(["--help"], write);

      // Assert
      expect(exitCode).toBe(0);
      expect(output.join("")).toContain("Usage: skillsmith");
    });

    it("entity ありでその entity のヘルプを表示して終了コード 0 を返す", async () => {
      // Arrange
      registerCommand({
        entity: "plugin",
        action: "export",
        description: "プラグインをエクスポート",
        handler: vi.fn().mockResolvedValue(0),
      });
      const { output, write } = captureOutput();

      // Act
      const exitCode = await route(["plugin", "--help"], write);

      // Assert
      expect(exitCode).toBe(0);
      const text = output.join("");
      expect(text).toContain("plugin");
      expect(text).toContain("export");
      expect(text).toContain("プラグインをエクスポート");
    });
  });

  describe("コマンドルーティング", () => {
    it("登録済みコマンドにマッチしたらハンドラを実行する", async () => {
      // Arrange
      const handler = vi.fn().mockResolvedValue(0);
      registerCommand({
        entity: "plugin",
        action: "export",
        description: "test",
        handler,
      });
      const { write } = captureOutput();

      // Act
      const exitCode = await route(["plugin", "export"], write);

      // Assert
      expect(exitCode).toBe(0);
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "plugin",
          action: "export",
        }),
      );
    });

    it("ハンドラの戻り値を終了コードとして返す", async () => {
      // Arrange
      const handler = vi.fn().mockResolvedValue(2);
      registerCommand({
        entity: "plugin",
        action: "validate",
        description: "test",
        handler,
      });
      const { write } = captureOutput();

      // Act
      const exitCode = await route(["plugin", "validate"], write);

      // Assert
      expect(exitCode).toBe(2);
    });

    it("--json フラグをコンテキストに渡す", async () => {
      // Arrange
      const handler = vi.fn().mockResolvedValue(0);
      registerCommand({
        entity: "plugin",
        action: "list",
        description: "test",
        handler,
      });
      const { write } = captureOutput();

      // Act
      await route(["plugin", "list", "--json"], write);

      // Assert
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ json: true }),
        }),
      );
    });
  });

  describe("エラーケース", () => {
    it("引数なしで全体ヘルプを表示して終了コード 1 を返す", async () => {
      // Arrange
      const { output, write } = captureOutput();

      // Act
      const exitCode = await route([], write);

      // Assert
      expect(exitCode).toBe(1);
      expect(output.join("")).toContain("Usage: skillsmith");
    });

    it("entity のみで action がない場合、entity ヘルプを表示して終了コード 1 を返す", async () => {
      // Arrange
      registerCommand({
        entity: "plugin",
        action: "export",
        description: "test",
        handler: vi.fn().mockResolvedValue(0),
      });
      const { output, write } = captureOutput();

      // Act
      const exitCode = await route(["plugin"], write);

      // Assert
      expect(exitCode).toBe(1);
      expect(output.join("")).toContain("export");
    });

    it("未登録のコマンドでエラーメッセージと全体ヘルプを表示して終了コード 1 を返す", async () => {
      // Arrange
      const { output, write } = captureOutput();

      // Act
      const exitCode = await route(["unknown", "cmd"], write);

      // Assert
      expect(exitCode).toBe(1);
      expect(output.join("")).toContain("Unknown command: unknown cmd");
    });
  });

  describe("判定優先順位", () => {
    it("--version は --help より優先される", async () => {
      // Arrange
      const { output, write } = captureOutput();

      // Act
      const exitCode = await route(["--version", "--help"], write);

      // Assert
      expect(exitCode).toBe(0);
      expect(output.join("")).toContain("1.0.0");
      expect(output.join("")).not.toContain("Usage:");
    });

    it("--help はコマンド実行より優先される", async () => {
      // Arrange
      const handler = vi.fn().mockResolvedValue(0);
      registerCommand({
        entity: "plugin",
        action: "export",
        description: "test",
        handler,
      });
      const { output, write } = captureOutput();

      // Act
      const exitCode = await route(["plugin", "export", "--help"], write);

      // Assert
      expect(exitCode).toBe(0);
      expect(handler).not.toHaveBeenCalled();
      expect(output.join("")).toContain("plugin");
    });
  });
});
