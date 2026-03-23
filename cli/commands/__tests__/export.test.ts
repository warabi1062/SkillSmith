import { afterEach, describe, expect, it, vi } from "vitest";
import { clearCommands, route } from "../../router";

// モック設定
vi.mock("../../../app/lib/types/loader.server", () => ({
  loadPluginDefinition: vi.fn(),
}));

vi.mock("../../../app/lib/exporter.server", () => ({
  exportPlugin: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
}));

import { registerExportCommand } from "../export";
import { loadPluginDefinition } from "../../../app/lib/types/loader.server";
import { exportPlugin } from "../../../app/lib/exporter.server";
import { access } from "node:fs/promises";

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

// route の write 引数用ダミー（ヘルプ/バージョン出力用、ここでは使わない）
const noop = () => {};

describe("export コマンド", () => {
  afterEach(() => {
    clearCommands();
    vi.restoreAllMocks();
  });

  it("正常系: ファイルをエクスポートして成功メッセージを出力する", async () => {
    // Arrange
    registerExportCommand();
    const { stdoutData, cleanup } = captureProcessOutput();

    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(loadPluginDefinition).mockResolvedValue({
      name: "test-plugin",
      description: "A test plugin",
      skills: [],

    });
    vi.mocked(exportPlugin).mockResolvedValue({
      success: true,
      exportedDir: "/tmp/output",
      writtenFiles: [".claude-plugin/plugin.json", "skills/my-skill/SKILL.md"],
      skippedFiles: [],
      errors: [],
    });

    try {
      // Act
      const exitCode = await route(
        ["plugin", "export", "./plugin.ts", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(0);
      const output = stdoutData.join("");
      expect(output).toContain("plugin.json");
      expect(output).toContain("SKILL.md");
    } finally {
      cleanup();
    }
  });

  it("--output 未指定でエラーを返す", async () => {
    // Arrange
    registerExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();

    try {
      // Act
      const exitCode = await route(
        ["plugin", "export", "./plugin.ts"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      expect(stderrData.join("")).toContain("--output");
    } finally {
      cleanup();
    }
  });

  it("plugin-file 未指定でエラーを返す", async () => {
    // Arrange
    registerExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();

    try {
      // Act
      const exitCode = await route(
        ["plugin", "export", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      expect(stderrData.join("")).toContain("プラグインファイル");
    } finally {
      cleanup();
    }
  });

  it("--overwrite オプションを exportPlugin に渡す", async () => {
    // Arrange
    registerExportCommand();
    const { cleanup } = captureProcessOutput();

    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(loadPluginDefinition).mockResolvedValue({
      name: "test-plugin",
      skills: [],

    });
    vi.mocked(exportPlugin).mockResolvedValue({
      success: true,
      exportedDir: "/tmp/output",
      writtenFiles: [],
      skippedFiles: [],
      errors: [],
    });

    try {
      // Act
      await route(
        ["plugin", "export", "./plugin.ts", "--output", "/tmp/output", "--overwrite"],
        noop,
      );

      // Assert
      expect(exportPlugin).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ overwrite: true }),
      );
    } finally {
      cleanup();
    }
  });

  it("--json モードで JSON 出力する", async () => {
    // Arrange
    registerExportCommand();
    const { stdoutData, cleanup } = captureProcessOutput();

    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(loadPluginDefinition).mockResolvedValue({
      name: "test-plugin",
      skills: [],

    });
    vi.mocked(exportPlugin).mockResolvedValue({
      success: true,
      exportedDir: "/tmp/output",
      writtenFiles: ["skills/a/SKILL.md"],
      skippedFiles: [],
      errors: [],
    });

    try {
      // Act
      const exitCode = await route(
        ["plugin", "export", "./plugin.ts", "--output", "/tmp/output", "--json"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdoutData.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.data.writtenFiles).toContain("skills/a/SKILL.md");
    } finally {
      cleanup();
    }
  });

  it("exportPlugin がエラーを返した場合にエラーメッセージを出力する", async () => {
    // Arrange
    registerExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();

    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(loadPluginDefinition).mockResolvedValue({
      name: "test-plugin",
      skills: [],

    });
    vi.mocked(exportPlugin).mockResolvedValue({
      success: false,
      exportedDir: "",
      writtenFiles: [],
      skippedFiles: [],
      errors: ["Write failed"],
    });

    try {
      // Act
      const exitCode = await route(
        ["plugin", "export", "./plugin.ts", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      expect(stderrData.join("")).toContain("Write failed");
    } finally {
      cleanup();
    }
  });

  it("存在しないファイルを指定した場合にエラーを返す", async () => {
    // Arrange
    registerExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();

    vi.mocked(access).mockRejectedValue(new Error("ENOENT"));

    try {
      // Act
      const exitCode = await route(
        ["plugin", "export", "./nonexistent.ts", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      expect(stderrData.join("")).toContain("ファイルが見つかりません");
    } finally {
      cleanup();
    }
  });
});
