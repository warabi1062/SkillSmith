import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutputStreams } from "../output";
import type { CommandContext } from "../types";

// plugins.server のモック
vi.mock("../../app/lib/plugins.server", () => ({
  getComponents: vi.fn(),
  getComponent: vi.fn(),
  createComponent: vi.fn(),
  updateComponent: vi.fn(),
  deleteComponent: vi.fn(),
}));

import {
  getComponents,
  getComponent,
  createComponent,
  updateComponent,
  deleteComponent,
} from "../../app/lib/plugins.server";
import {
  handleList,
  handleShow,
  handleCreate,
  handleUpdate,
  handleDelete,
  setOutputStreams,
} from "../commands/component";

// モック関数の型キャスト
const mockGetComponents = getComponents as ReturnType<typeof vi.fn>;
const mockGetComponent = getComponent as ReturnType<typeof vi.fn>;
const mockCreateComponent = createComponent as ReturnType<typeof vi.fn>;
const mockUpdateComponent = updateComponent as ReturnType<typeof vi.fn>;
const mockDeleteComponent = deleteComponent as ReturnType<typeof vi.fn>;

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
    entity: "component",
    action: "",
    args: [],
    options: { json: false, help: false, version: false },
    ...overrides,
  };
}

describe("component コマンド", () => {
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
    it("コンポーネント一覧をテーブル形式で出力する", async () => {
      // Arrange
      mockGetComponents.mockResolvedValue([
        {
          id: "c1",
          pluginId: "p1",
          updatedAt: new Date("2025-01-01T00:00:00Z"),
          skillConfig: { name: "my-skill", skillType: "WORKER" },
        },
        {
          id: "c2",
          pluginId: "p1",
          updatedAt: new Date("2025-01-02T00:00:00Z"),
          skillConfig: { name: "another-skill", skillType: "ENTRY_POINT" },
        },
      ]);
      const ctx = createCtx({ action: "list", args: ["--plugin", "p1"] });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("ID");
      expect(output).toContain("Name");
      expect(output).toContain("SkillType");
      expect(output).toContain("c1");
      expect(output).toContain("my-skill");
      expect(output).toContain("WORKER");
      expect(output).toContain("c2");
      expect(output).toContain("another-skill");
      expect(output).toContain("ENTRY_POINT");
    });

    it("--plugin 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({ action: "list", args: [] });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--plugin is required");
    });

    it("コンポーネントが存在しない場合メッセージを表示する", async () => {
      // Arrange
      mockGetComponents.mockResolvedValue([]);
      const ctx = createCtx({ action: "list", args: ["--plugin", "p1"] });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("No components found.");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const components = [
        {
          id: "c1",
          pluginId: "p1",
          updatedAt: new Date("2025-01-01T00:00:00Z"),
          skillConfig: { name: "my-skill", skillType: "WORKER" },
        },
      ];
      mockGetComponents.mockResolvedValue(components);
      const ctx = createCtx({
        action: "list",
        args: ["--plugin", "p1"],
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
      expect(parsed.data[0].id).toBe("c1");
    });

    it("取得エラー時にエラーメッセージを出力する", async () => {
      // Arrange
      mockGetComponents.mockRejectedValue(new Error("DB connection failed"));
      const ctx = createCtx({ action: "list", args: ["--plugin", "p1"] });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("DB connection failed");
    });
  });

  describe("handleShow", () => {
    it("コンポーネント詳細をキー・バリュー形式で出力する", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue({
        id: "c1",
        pluginId: "p1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
        skillConfig: {
          name: "my-skill",
          description: "A test skill",
          skillType: "WORKER",
          argumentHint: "--name <n>",
          allowedTools: "Read,Write",
          content: "some content here",
          input: "input data",
          output: "output data",
          agentConfig: null,
        },
        files: [
          { role: "TEMPLATE", content: "template content" },
          { role: "REFERENCE", content: "reference content here" },
        ],
      });
      const ctx = createCtx({ action: "show", args: ["c1"] });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("ID:           c1");
      expect(output).toContain("PluginID:     p1");
      expect(output).toContain("Name:         my-skill");
      expect(output).toContain("Description:  A test skill");
      expect(output).toContain("SkillType:    WORKER");
      expect(output).toContain("ArgumentHint: --name <n>");
      expect(output).toContain("AllowedTools: Read,Write");
      expect(output).toContain("Content:      17 chars");
      expect(output).toContain("Input:        10 chars");
      expect(output).toContain("Output:       11 chars");
      expect(output).toContain("Template:     16 chars");
      expect(output).toContain("Reference:    22 chars");
      expect(output).toContain("Files:        2");
      expect(output).toContain("AgentConfig:  no");
    });

    it("null/未設定フィールドを (none) で表示する", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue({
        id: "c1",
        pluginId: "p1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
        skillConfig: {
          name: "my-skill",
          description: null,
          skillType: "WORKER",
          argumentHint: null,
          allowedTools: null,
          content: null,
          input: null,
          output: null,
          agentConfig: null,
        },
        files: [],
      });
      const ctx = createCtx({ action: "show", args: ["c1"] });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("Description:  (none)");
      expect(output).toContain("ArgumentHint: (none)");
      expect(output).toContain("AllowedTools: (none)");
      expect(output).toContain("Content:      (none)");
      expect(output).toContain("Input:        (none)");
      expect(output).toContain("Output:       (none)");
      expect(output).toContain("Template:     (none)");
      expect(output).toContain("Reference:    (none)");
    });

    it("空文字列のフィールドを 0 chars で表示する", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue({
        id: "c1",
        pluginId: "p1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
        skillConfig: {
          name: "my-skill",
          description: null,
          skillType: "WORKER",
          argumentHint: null,
          allowedTools: null,
          content: "",
          input: "",
          output: "",
          agentConfig: null,
        },
        files: [
          { role: "TEMPLATE", content: "" },
          { role: "REFERENCE", content: "" },
        ],
      });
      const ctx = createCtx({ action: "show", args: ["c1"] });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("Content:      0 chars");
      expect(output).toContain("Input:        0 chars");
      expect(output).toContain("Output:       0 chars");
      expect(output).toContain("Template:     0 chars");
      expect(output).toContain("Reference:    0 chars");
    });

    it("ID未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({ action: "show", args: [] });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Component ID is required");
    });

    it("存在しないIDでエラーを返す", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue(null);
      const ctx = createCtx({ action: "show", args: ["nonexistent"] });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Component not found: nonexistent");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const component = {
        id: "c1",
        pluginId: "p1",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
        skillConfig: {
          name: "my-skill",
          description: null,
          skillType: "WORKER",
          agentConfig: null,
        },
        files: [],
      };
      mockGetComponent.mockResolvedValue(component);
      const ctx = createCtx({
        action: "show",
        args: ["c1"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleShow(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("c1");
    });
  });

  describe("handleCreate", () => {
    it("正常にコンポーネントを作成する", async () => {
      // Arrange
      mockCreateComponent.mockResolvedValue({
        id: "new-id",
        skillConfig: { name: "new-skill" },
      });
      const ctx = createCtx({
        action: "create",
        args: ["--plugin", "p1", "--name", "new-skill", "--skill-type", "WORKER"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockCreateComponent).toHaveBeenCalledWith("p1", {
        type: "SKILL",
        name: "new-skill",
        description: undefined,
        skillType: "WORKER",
      });
      const output = streams.stdoutData.join("");
      expect(output).toContain("Created component: new-skill (new-id)");
    });

    it("--plugin 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "create",
        args: ["--name", "test", "--skill-type", "WORKER"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--plugin is required");
    });

    it("--name 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "create",
        args: ["--plugin", "p1", "--skill-type", "WORKER"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--name is required");
    });

    it("--skill-type 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "create",
        args: ["--plugin", "p1", "--name", "test"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--skill-type is required");
    });

    it("不正な skill-type でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "create",
        args: ["--plugin", "p1", "--name", "test", "--skill-type", "INVALID"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Invalid --skill-type: INVALID");
      expect(output).toContain("ENTRY_POINT");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const component = {
        id: "new-id",
        skillConfig: { name: "new-skill" },
      };
      mockCreateComponent.mockResolvedValue(component);
      const ctx = createCtx({
        action: "create",
        args: ["--plugin", "p1", "--name", "new-skill", "--skill-type", "WORKER"],
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
    it("正常にコンポーネントを部分更新する", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue({
        id: "c1",
        skillConfig: {
          name: "existing-name",
          skillType: "WORKER",
          description: "existing desc",
        },
      });
      mockUpdateComponent.mockResolvedValue({
        id: "c1",
        skillConfig: { name: "updated-name" },
      });
      const ctx = createCtx({
        action: "update",
        args: ["c1", "--name", "updated-name"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockUpdateComponent).toHaveBeenCalledWith("c1", {
        type: "SKILL",
        name: "updated-name",
        skillType: "WORKER",
      });
      const output = streams.stdoutData.join("");
      expect(output).toContain("Updated component: updated-name (c1)");
    });

    it("type: SKILL が固定値として渡される", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue({
        id: "c1",
        skillConfig: {
          name: "existing-name",
          skillType: "WORKER",
        },
      });
      mockUpdateComponent.mockResolvedValue({
        id: "c1",
        skillConfig: { name: "existing-name" },
      });
      const ctx = createCtx({
        action: "update",
        args: ["c1", "--description", "new desc"],
      });

      // Act
      await handleUpdate(ctx);

      // Assert
      const callArgs = mockUpdateComponent.mock.calls[0][1];
      expect(callArgs.type).toBe("SKILL");
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
      expect(output).toContain("Component ID is required");
    });

    it("更新フィールド未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "update",
        args: ["c1"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("At least one update option is required");
    });

    it("存在しないIDで Prisma P2025 エラーを返す", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue({
        id: "nonexistent",
        skillConfig: { name: "test", skillType: "WORKER" },
      });
      const error = new Error("Record not found");
      (error as unknown as { code: string }).code = "P2025";
      mockUpdateComponent.mockRejectedValue(error);
      const ctx = createCtx({
        action: "update",
        args: ["nonexistent", "--name", "test"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Component not found: nonexistent");
    });

    it("不正な skill-type でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "update",
        args: ["c1", "--skill-type", "INVALID"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Invalid --skill-type: INVALID");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue({
        id: "c1",
        skillConfig: { name: "existing-name", skillType: "WORKER" },
      });
      const component = { id: "c1", skillConfig: { name: "updated" } };
      mockUpdateComponent.mockResolvedValue(component);
      const ctx = createCtx({
        action: "update",
        args: ["c1", "--name", "updated"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("c1");
    });

    it("skillConfig が存在しない場合データ整合性エラーを返す", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue({
        id: "c1",
        skillConfig: null,
      });
      const ctx = createCtx({
        action: "update",
        args: ["c1", "--name", "test"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("has no skill configuration");
      expect(output).toContain("Data integrity issue");
    });

    it("getComponent で存在しない場合エラーを返す", async () => {
      // Arrange
      mockGetComponent.mockResolvedValue(null);
      const ctx = createCtx({
        action: "update",
        args: ["nonexistent", "--name", "test"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Component not found: nonexistent");
    });
  });

  describe("handleDelete", () => {
    it("ID 指定でコンポーネントを削除する", async () => {
      // Arrange
      mockDeleteComponent.mockResolvedValue({
        id: "c1",
      });
      const ctx = createCtx({
        action: "delete",
        args: ["c1"],
      });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockDeleteComponent).toHaveBeenCalledWith("c1");
      const output = streams.stdoutData.join("");
      expect(output).toContain("Deleted component: c1");
    });

    it("ID 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({ action: "delete", args: [] });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Component ID is required");
    });

    it("存在しないIDで Prisma P2025 エラーを返す", async () => {
      // Arrange
      const error = new Error("Record not found");
      (error as unknown as { code: string }).code = "P2025";
      mockDeleteComponent.mockRejectedValue(error);
      const ctx = createCtx({
        action: "delete",
        args: ["nonexistent"],
      });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Component not found: nonexistent");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const component = { id: "c1" };
      mockDeleteComponent.mockResolvedValue(component);
      const ctx = createCtx({
        action: "delete",
        args: ["c1"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("c1");
    });
  });
});
