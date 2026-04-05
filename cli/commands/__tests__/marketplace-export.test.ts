import { afterEach, describe, expect, it, vi } from "vitest";
import { clearCommands, route } from "../../router";

// モック設定
vi.mock("../../../app/lib/loader", () => ({
  loadPluginDefinition: vi.fn(),
  loadMarketplaceDefinition: vi.fn(),
}));

vi.mock("../../../app/lib/exporter.server", () => ({
  exportPlugin: vi.fn(),
}));

vi.mock("../../../app/lib/generator/marketplace-json-generator.server", () => ({
  generateMarketplaceJson: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

import { registerMarketplaceExportCommand } from "../marketplace-export";
import {
  loadPluginDefinition,
  loadMarketplaceDefinition,
} from "../../../app/lib/loader";
import { exportPlugin } from "../../../app/lib/exporter.server";
import { generateMarketplaceJson } from "../../../app/lib/generator/marketplace-json-generator.server";
import { mkdir, writeFile } from "node:fs/promises";

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

// route の write 引数用ダミー
const noop = () => {};

// テスト用のマーケットプレイス定義
function createMarketplaceDef(pluginNames: string[] = ["plugin-a", "plugin-b"]) {
  return {
    name: "test-marketplace",
    description: "テスト用マーケットプレイス",
    plugins: pluginNames.map((name) => ({
      name,
      skills: [],
    })),
  };
}

describe("marketplace export コマンド", () => {
  afterEach(() => {
    clearCommands();
    vi.restoreAllMocks();
  });

  it("全プラグインが正常にエクスポートされ、marketplace.json が生成される", async () => {
    // Arrange
    registerMarketplaceExportCommand();
    const { stdoutData, cleanup } = captureProcessOutput();
    const marketplaceDef = createMarketplaceDef();

    vi.mocked(loadMarketplaceDefinition).mockResolvedValue(marketplaceDef);
    vi.mocked(loadPluginDefinition).mockResolvedValue({
      name: "plugin-a",
      skills: [],
    });
    vi.mocked(exportPlugin).mockResolvedValue({
      success: true,
      exportedDir: "/tmp/output/plugins/plugin-a",
      writtenFiles: ["skills/my-skill/SKILL.md"],
      skippedFiles: [],
      errors: [],
    });
    vi.mocked(generateMarketplaceJson).mockReturnValue({
      file: { path: "marketplace.json", content: '{"name":"test"}' },
      errors: [],
    });
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    try {
      // Act
      const exitCode = await route(
        ["marketplace", "export", "./marketplace", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(0);
      const output = stdoutData.join("");
      expect(output).toContain("marketplace");
      expect(output).toContain("plugin-a");
      expect(output).toContain("plugin-b");
      expect(output).toContain("marketplace.json");
    } finally {
      cleanup();
    }
  });

  it("--json モードで JSON 出力する", async () => {
    // Arrange
    registerMarketplaceExportCommand();
    const { stdoutData, cleanup } = captureProcessOutput();
    const marketplaceDef = createMarketplaceDef(["plugin-a"]);

    vi.mocked(loadMarketplaceDefinition).mockResolvedValue(marketplaceDef);
    vi.mocked(loadPluginDefinition).mockResolvedValue({
      name: "plugin-a",
      skills: [],
    });
    vi.mocked(exportPlugin).mockResolvedValue({
      success: true,
      exportedDir: "/tmp/output/plugins/plugin-a",
      writtenFiles: ["skills/a/SKILL.md"],
      skippedFiles: [],
      errors: [],
    });
    vi.mocked(generateMarketplaceJson).mockReturnValue({
      file: { path: "marketplace.json", content: '{"name":"test"}' },
      errors: [],
    });
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);

    try {
      // Act
      const exitCode = await route(
        ["marketplace", "export", "./marketplace", "--output", "/tmp/output", "--json"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdoutData.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.data.exportedPlugins).toContain("plugin-a");
      expect(parsed.data.marketplaceJson).toContain("marketplace.json");
    } finally {
      cleanup();
    }
  });

  it("--output 未指定でバリデーションエラー", async () => {
    // Arrange
    registerMarketplaceExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();

    try {
      // Act
      const exitCode = await route(
        ["marketplace", "export", "./marketplace"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      const errorOutput = stderrData.join("");
      expect(errorOutput).toContain("[validation]");
      expect(errorOutput).toContain("--output");
    } finally {
      cleanup();
    }
  });

  it("marketplace ディレクトリ未指定でバリデーションエラー", async () => {
    // Arrange
    registerMarketplaceExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();

    try {
      // Act
      const exitCode = await route(
        ["marketplace", "export", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      const errorOutput = stderrData.join("");
      expect(errorOutput).toContain("[validation]");
      expect(errorOutput).toContain("marketplace");
    } finally {
      cleanup();
    }
  });

  it("marketplace.ts が存在しない場合にエラーを返す", async () => {
    // Arrange
    registerMarketplaceExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();

    vi.mocked(loadMarketplaceDefinition).mockRejectedValue(
      new Error("marketplace.ts が見つかりません"),
    );

    try {
      // Act
      const exitCode = await route(
        ["marketplace", "export", "./marketplace", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      const errorOutput = stderrData.join("");
      expect(errorOutput).toContain("[execution]");
      expect(errorOutput).toContain("marketplace.ts が見つかりません");
    } finally {
      cleanup();
    }
  });

  it("個別プラグインのエクスポート失敗時にエラーを返す", async () => {
    // Arrange
    registerMarketplaceExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();
    const marketplaceDef = createMarketplaceDef(["plugin-ok", "plugin-fail"]);

    vi.mocked(loadMarketplaceDefinition).mockResolvedValue(marketplaceDef);
    vi.mocked(loadPluginDefinition).mockResolvedValue({
      name: "plugin-fail",
      skills: [],
    });
    // 1つ目は成功、2つ目は失敗
    vi.mocked(exportPlugin)
      .mockResolvedValueOnce({
        success: true,
        exportedDir: "/tmp/output/plugins/plugin-ok",
        writtenFiles: [],
        skippedFiles: [],
        errors: [],
      })
      .mockResolvedValueOnce({
        success: false,
        exportedDir: "",
        writtenFiles: [],
        skippedFiles: [],
        errors: ["Write failed"],
      });

    try {
      // Act
      const exitCode = await route(
        ["marketplace", "export", "./marketplace", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      const errorOutput = stderrData.join("");
      expect(errorOutput).toContain("[execution]");
      expect(errorOutput).toContain("plugin-fail");
    } finally {
      cleanup();
    }
  });

  it("loadPluginDefinition が例外をスローした場合にエラーを返す", async () => {
    // Arrange
    registerMarketplaceExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();
    const marketplaceDef = createMarketplaceDef(["broken-plugin"]);

    vi.mocked(loadMarketplaceDefinition).mockResolvedValue(marketplaceDef);
    vi.mocked(loadPluginDefinition).mockRejectedValue(
      new Error("plugin.ts の読み込みに失敗しました"),
    );

    try {
      // Act
      const exitCode = await route(
        ["marketplace", "export", "./marketplace", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      const errorOutput = stderrData.join("");
      expect(errorOutput).toContain("[execution]");
      expect(errorOutput).toContain("plugin.ts の読み込みに失敗しました");
    } finally {
      cleanup();
    }
  });

  it("marketplace.json 生成時に fatal error がある場合にエラーを返す", async () => {
    // Arrange
    registerMarketplaceExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();
    const marketplaceDef = createMarketplaceDef(["plugin-a"]);

    vi.mocked(loadMarketplaceDefinition).mockResolvedValue(marketplaceDef);
    vi.mocked(loadPluginDefinition).mockResolvedValue({
      name: "plugin-a",
      skills: [],
    });
    vi.mocked(exportPlugin).mockResolvedValue({
      success: true,
      exportedDir: "/tmp/output/plugins/plugin-a",
      writtenFiles: [],
      skippedFiles: [],
      errors: [],
    });
    vi.mocked(generateMarketplaceJson).mockReturnValue({
      file: { path: "marketplace.json", content: "" },
      errors: [
        {
          severity: "error",
          code: "MARKETPLACE_NAME_REQUIRED",
          message: "name は必須です",
        },
      ],
    });

    try {
      // Act
      const exitCode = await route(
        ["marketplace", "export", "./marketplace", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      const errorOutput = stderrData.join("");
      expect(errorOutput).toContain("[validation]");
      expect(errorOutput).toContain("marketplace.json");
    } finally {
      cleanup();
    }
  });

  it("marketplace.json のファイル書き出し失敗時にエラーを返す", async () => {
    // Arrange
    registerMarketplaceExportCommand();
    const { stderrData, cleanup } = captureProcessOutput();
    const marketplaceDef = createMarketplaceDef(["plugin-a"]);

    vi.mocked(loadMarketplaceDefinition).mockResolvedValue(marketplaceDef);
    vi.mocked(loadPluginDefinition).mockResolvedValue({
      name: "plugin-a",
      skills: [],
    });
    vi.mocked(exportPlugin).mockResolvedValue({
      success: true,
      exportedDir: "/tmp/output/plugins/plugin-a",
      writtenFiles: [],
      skippedFiles: [],
      errors: [],
    });
    vi.mocked(generateMarketplaceJson).mockReturnValue({
      file: { path: "marketplace.json", content: '{"name":"test"}' },
      errors: [],
    });
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockRejectedValue(new Error("EACCES"));

    try {
      // Act
      const exitCode = await route(
        ["marketplace", "export", "./marketplace", "--output", "/tmp/output"],
        noop,
      );

      // Assert
      expect(exitCode).toBe(1);
      const errorOutput = stderrData.join("");
      expect(errorOutput).toContain("[io]");
      expect(errorOutput).toContain("marketplace.json");
    } finally {
      cleanup();
    }
  });
});
