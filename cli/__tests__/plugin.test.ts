import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutputStreams } from "../output";
import type { CommandContext } from "../types";

// plugins.server のモック
vi.mock("../../app/lib/plugins.server", () => ({
  getPlugins: vi.fn(),
  getPlugin: vi.fn(),
  createPlugin: vi.fn(),
  updatePlugin: vi.fn(),
  deletePlugin: vi.fn(),
}));

import {
  getPlugins,
  getPlugin,
  createPlugin,
  updatePlugin,
  deletePlugin,
} from "../../app/lib/plugins.server";
import {
  handleList,
  handleShow,
  handleCreate,
  handleUpdate,
  handleDelete,
  setOutputStreams,
} from "../commands/plugin";

// モック関数の型キャスト
const mockGetPlugins = getPlugins as ReturnType<typeof vi.fn>;
const mockGetPlugin = getPlugin as ReturnType<typeof vi.fn>;
const mockCreatePlugin = createPlugin as ReturnType<typeof vi.fn>;
const mockUpdatePlugin = updatePlugin as ReturnType<typeof vi.fn>;
const mockDeletePlugin = deletePlugin as ReturnType<typeof vi.fn>;

// テスト用の出力ストリームを作成するヘルパー
function createMockStreams(): OutputStreams & {
  stdoutData: string[];
  stderrData: string[];
} {
  const stdoutData: string[] = [];
  const stderrData: string[] = [];
  return {
    stdout: { write: (s: string) => { stdoutData.push(s); } },
    stderr: { write: (s: string) => { stderrData.push(s); } },
    stdoutData,
    stderrData,
  };
}

// テスト用の CommandContext を作成するヘルパー
function createCtx(
  overrides: Partial<CommandContext> = {},
): CommandContext {
  return {
    entity: "plugin",
    action: "",
    args: [],
    options: { json: false, help: false, version: false },
    ...overrides,
  };
}

describe("plugin コマンド", () => {
  let streams: ReturnType<typeof createMockStreams>;

  beforeEach(() => {
    streams = createMockStreams();
    setOutputStreams(streams);
  });

  afterEach(() => {
    setOutputStreams(undefined);
    vi.resetAllMocks();
  });

  describe("handleList", () => {
    it("プラグイン一覧をテーブル形式で出力する", async () => {
      // Arrange
      mockGetPlugins.mockResolvedValue([
        {
          id: "p1",
          name: "Plugin A",
          updatedAt: new Date("2025-01-01T00:00:00Z"),
          _count: { components: 3 },
        },
        {
          id: "p2",
          name: "Plugin B",
          updatedAt: new Date("2025-01-02T00:00:00Z"),
          _count: { components: 0 },
        },
      ]);
      const ctx = createCtx({ action: "list" });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("ID");
      expect(output).toContain("Name");
      expect(output).toContain("p1");
      expect(output).toContain("Plugin A");
      expect(output).toContain("3");
      expect(output).toContain("p2");
      expect(output).toContain("Plugin B");
    });

    it("プラグインが存在しない場合メッセージを表示する", async () => {
      // Arrange
      mockGetPlugins.mockResolvedValue([]);
      const ctx = createCtx({ action: "list" });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("No plugins found.");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const plugins = [
        {
          id: "p1",
          name: "Plugin A",
          updatedAt: new Date("2025-01-01T00:00:00Z"),
          _count: { components: 3 },
        },
      ];
      mockGetPlugins.mockResolvedValue(plugins);
      const ctx = createCtx({
        action: "list",
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0].id).toBe("p1");
    });

    it("取得エラー時にエラーメッセージを出力する", async () => {
      // Arrange
      mockGetPlugins.mockRejectedValue(new Error("DB connection failed"));
      const ctx = createCtx({ action: "list" });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("DB connection failed");
    });
  });

  describe("handleShow", () => {
    it("プラグイン詳細をキー・バリュー形式で出力する", async () => {
      // Arrange
      mockGetPlugin.mockResolvedValue({
        id: "p1",
        name: "Plugin A",
        description: "A test plugin",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
        components: [
          {
            type: "SKILL",
            skillConfig: { name: "my-skill", skillType: "WORKER" },
          },
        ],
      });
      const ctx = createCtx({ action: "show", args: ["p1"] });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("ID:");
      expect(output).toContain("p1");
      expect(output).toContain("Plugin A");
      expect(output).toContain("A test plugin");
      expect(output).toContain("Components:");
      expect(output).toContain("my-skill");
      expect(output).toContain("WORKER");
    });

    it("コンポーネントがない場合 (none) を表示する", async () => {
      // Arrange
      mockGetPlugin.mockResolvedValue({
        id: "p1",
        name: "Plugin A",
        description: null,
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
        components: [],
      });
      const ctx = createCtx({ action: "show", args: ["p1"] });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("Components: (none)");
      expect(output).toContain("Description: (none)");
    });

    it("ID未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({ action: "show", args: [] });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Plugin ID is required");
    });

    it("存在しないIDでエラーを返す", async () => {
      // Arrange
      mockGetPlugin.mockResolvedValue(null);
      const ctx = createCtx({ action: "show", args: ["nonexistent"] });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Plugin not found: nonexistent");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const plugin = {
        id: "p1",
        name: "Plugin A",
        description: null,
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
        components: [],
      };
      mockGetPlugin.mockResolvedValue(plugin);
      const ctx = createCtx({
        action: "show",
        args: ["p1"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("p1");
    });
  });

  describe("handleCreate", () => {
    it("--name 指定でプラグインを作成する", async () => {
      // Arrange
      mockCreatePlugin.mockResolvedValue({
        id: "new-id",
        name: "New Plugin",
        description: null,
      });
      const ctx = createCtx({
        action: "create",
        args: ["--name", "New Plugin"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockCreatePlugin).toHaveBeenCalledWith({
        name: "New Plugin",
        description: undefined,
      });
      const output = streams.stdoutData.join("");
      expect(output).toContain("Created plugin: New Plugin (new-id)");
    });

    it("--description も指定できる", async () => {
      // Arrange
      mockCreatePlugin.mockResolvedValue({
        id: "new-id",
        name: "New Plugin",
        description: "A description",
      });
      const ctx = createCtx({
        action: "create",
        args: ["--name", "New Plugin", "--description", "A description"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockCreatePlugin).toHaveBeenCalledWith({
        name: "New Plugin",
        description: "A description",
      });
    });

    it("--name 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({ action: "create", args: [] });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--name is required");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const plugin = { id: "new-id", name: "New Plugin", description: null };
      mockCreatePlugin.mockResolvedValue(plugin);
      const ctx = createCtx({
        action: "create",
        args: ["--name", "New Plugin"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("new-id");
    });
  });

  describe("handleUpdate", () => {
    it("ID と --name 指定でプラグインを更新する", async () => {
      // Arrange
      mockUpdatePlugin.mockResolvedValue({
        id: "p1",
        name: "Updated Name",
        description: null,
      });
      const ctx = createCtx({
        action: "update",
        args: ["p1", "--name", "Updated Name"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockUpdatePlugin).toHaveBeenCalledWith("p1", {
        name: "Updated Name",
        description: undefined,
      });
      const output = streams.stdoutData.join("");
      expect(output).toContain("Updated plugin: Updated Name (p1)");
    });

    it("--description も指定できる", async () => {
      // Arrange
      mockUpdatePlugin.mockResolvedValue({
        id: "p1",
        name: "Updated",
        description: "New desc",
      });
      const ctx = createCtx({
        action: "update",
        args: ["p1", "--name", "Updated", "--description", "New desc"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockUpdatePlugin).toHaveBeenCalledWith("p1", {
        name: "Updated",
        description: "New desc",
      });
    });

    it("ID 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "update",
        args: ["--name", "test"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Plugin ID is required");
    });

    it("--name 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "update",
        args: ["p1"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--name is required");
    });

    it("存在しないIDで Prisma P2025 エラーを返す", async () => {
      // Arrange
      const error = new Error("Record not found");
      (error as unknown as { code: string }).code = "P2025";
      mockUpdatePlugin.mockRejectedValue(error);
      const ctx = createCtx({
        action: "update",
        args: ["nonexistent", "--name", "test"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Plugin not found: nonexistent");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const plugin = { id: "p1", name: "Updated", description: null };
      mockUpdatePlugin.mockResolvedValue(plugin);
      const ctx = createCtx({
        action: "update",
        args: ["p1", "--name", "Updated"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("p1");
    });
  });

  describe("handleDelete", () => {
    it("ID 指定でプラグインを削除する", async () => {
      // Arrange
      mockDeletePlugin.mockResolvedValue({
        id: "p1",
        name: "Deleted Plugin",
      });
      const ctx = createCtx({
        action: "delete",
        args: ["p1"],
      });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockDeletePlugin).toHaveBeenCalledWith("p1");
      const output = streams.stdoutData.join("");
      expect(output).toContain("Deleted plugin: Deleted Plugin (p1)");
    });

    it("ID 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({ action: "delete", args: [] });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Plugin ID is required");
    });

    it("存在しないIDで Prisma P2025 エラーを返す", async () => {
      // Arrange
      const error = new Error("Record not found");
      (error as unknown as { code: string }).code = "P2025";
      mockDeletePlugin.mockRejectedValue(error);
      const ctx = createCtx({
        action: "delete",
        args: ["nonexistent"],
      });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Plugin not found: nonexistent");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const plugin = { id: "p1", name: "Deleted Plugin" };
      mockDeletePlugin.mockResolvedValue(plugin);
      const ctx = createCtx({
        action: "delete",
        args: ["p1"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("p1");
    });
  });
});
