import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutputStreams } from "../../output";
import type { CommandContext } from "../../types";

// plugins.server のモック
vi.mock("../../../app/lib/plugins.server", () => ({
  getComponentFiles: vi.fn(),
  getComponentFile: vi.fn(),
  createComponentFile: vi.fn(),
  updateComponentFile: vi.fn(),
  deleteComponentFile: vi.fn(),
}));

// ValidationError のモック（実際のクラスを使用）
vi.mock("../../../app/lib/validations", () => {
  class ValidationError extends Error {
    readonly field: string;
    readonly code: string;
    constructor({ field, code, message }: { field: string; code: string; message: string }) {
      super(message);
      this.name = "ValidationError";
      this.field = field;
      this.code = code;
    }
  }
  return { ValidationError };
});

import {
  getComponentFiles,
  getComponentFile,
  createComponentFile,
  updateComponentFile,
  deleteComponentFile,
} from "../../../app/lib/plugins.server";
import { ValidationError } from "../../../app/lib/validations";
import {
  handleList,
  handleCreate,
  handleUpdate,
  handleDelete,
  setOutputStreams,
} from "../file";

// モック関数の型キャスト
const mockGetComponentFiles = getComponentFiles as ReturnType<typeof vi.fn>;
const mockGetComponentFile = getComponentFile as ReturnType<typeof vi.fn>;
const mockCreateComponentFile = createComponentFile as ReturnType<typeof vi.fn>;
const mockUpdateComponentFile = updateComponentFile as ReturnType<typeof vi.fn>;
const mockDeleteComponentFile = deleteComponentFile as ReturnType<typeof vi.fn>;

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
    entity: "file",
    action: "",
    args: [],
    options: { json: false, help: false, version: false },
    ...overrides,
  };
}

describe("file コマンド", () => {
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
    it("ファイル一覧をテーブル形式で出力する", async () => {
      // Arrange
      mockGetComponentFiles.mockResolvedValue([
        { id: "f1", role: "TEMPLATE", filename: "template.md", sortOrder: 0 },
        { id: "f2", role: "REFERENCE", filename: "reference.md", sortOrder: 1 },
      ]);
      const ctx = createCtx({ action: "list", args: ["--component", "c1"] });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("ID");
      expect(output).toContain("Role");
      expect(output).toContain("Filename");
      expect(output).toContain("SortOrder");
      expect(output).toContain("f1");
      expect(output).toContain("TEMPLATE");
      expect(output).toContain("template.md");
      expect(output).toContain("f2");
      expect(output).toContain("REFERENCE");
      expect(output).toContain("reference.md");
    });

    it("--component 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({ action: "list", args: [] });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--component is required");
    });

    it("ファイルが存在しない場合メッセージを表示する", async () => {
      // Arrange
      mockGetComponentFiles.mockResolvedValue([]);
      const ctx = createCtx({ action: "list", args: ["--component", "c1"] });

      // Act
      const exitCode = await handleList(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("No files found.");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const files = [
        { id: "f1", role: "TEMPLATE", filename: "template.md", sortOrder: 0 },
      ];
      mockGetComponentFiles.mockResolvedValue(files);
      const ctx = createCtx({
        action: "list",
        args: ["--component", "c1"],
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
      expect(parsed.data[0].id).toBe("f1");
    });
  });

  describe("handleCreate", () => {
    it("正常にファイルを作成する", async () => {
      // Arrange
      mockCreateComponentFile.mockResolvedValue({
        id: "f1",
        filename: "template.md",
      });
      const ctx = createCtx({
        action: "create",
        args: ["--component", "c1", "--role", "TEMPLATE", "--filename", "template.md", "--content", "hello"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockCreateComponentFile).toHaveBeenCalledWith("c1", {
        role: "TEMPLATE",
        filename: "template.md",
        content: "hello",
      });
      const output = streams.stdoutData.join("");
      expect(output).toContain("Created file: template.md (f1)");
    });

    it("--content 省略時にデフォルト空文字列で作成する", async () => {
      // Arrange
      mockCreateComponentFile.mockResolvedValue({
        id: "f1",
        filename: "template.md",
      });
      const ctx = createCtx({
        action: "create",
        args: ["--component", "c1", "--role", "TEMPLATE", "--filename", "template.md"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockCreateComponentFile).toHaveBeenCalledWith("c1", {
        role: "TEMPLATE",
        filename: "template.md",
        content: "",
      });
    });

    it("--component 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "create",
        args: ["--role", "TEMPLATE", "--filename", "test.md"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--component is required");
    });

    it("--role 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "create",
        args: ["--component", "c1", "--filename", "test.md"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--role is required");
    });

    it("不正な role でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "create",
        args: ["--component", "c1", "--role", "INVALID", "--filename", "test.md"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Invalid --role: INVALID");
      expect(output).toContain("TEMPLATE");
    });

    it("--filename 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "create",
        args: ["--component", "c1", "--role", "TEMPLATE"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--filename is required");
    });

    it("ValidationError 時にエラー出力する", async () => {
      // Arrange
      mockCreateComponentFile.mockRejectedValue(
        new ValidationError({
          field: "filename",
          code: "DUPLICATE_FILENAME",
          message: "A file with this filename already exists in this component",
        }),
      );
      const ctx = createCtx({
        action: "create",
        args: ["--component", "c1", "--role", "TEMPLATE", "--filename", "dup.md"],
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("A file with this filename already exists");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const file = { id: "f1", filename: "template.md" };
      mockCreateComponentFile.mockResolvedValue(file);
      const ctx = createCtx({
        action: "create",
        args: ["--component", "c1", "--role", "TEMPLATE", "--filename", "template.md"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleCreate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("f1");
    });
  });

  describe("handleUpdate", () => {
    it("正常にファイルを部分更新する（filename のみ）", async () => {
      // Arrange
      mockGetComponentFile.mockResolvedValue({
        id: "f1",
        filename: "old.md",
        content: "existing content",
      });
      mockUpdateComponentFile.mockResolvedValue({
        id: "f1",
        filename: "new.md",
      });
      const ctx = createCtx({
        action: "update",
        args: ["f1", "--filename", "new.md"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockUpdateComponentFile).toHaveBeenCalledWith("f1", {
        filename: "new.md",
        content: "existing content",
      });
      const output = streams.stdoutData.join("");
      expect(output).toContain("Updated file: new.md (f1)");
    });

    it("正常にファイルを部分更新する（content のみ）", async () => {
      // Arrange
      mockGetComponentFile.mockResolvedValue({
        id: "f1",
        filename: "template.md",
        content: "old content",
      });
      mockUpdateComponentFile.mockResolvedValue({
        id: "f1",
        filename: "template.md",
      });
      const ctx = createCtx({
        action: "update",
        args: ["f1", "--content", "new content"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockUpdateComponentFile).toHaveBeenCalledWith("f1", {
        filename: "template.md",
        content: "new content",
      });
    });

    it("ID 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "update",
        args: ["--filename", "test.md"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("File ID is required");
    });

    it("更新フィールド未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "update",
        args: ["f1"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("At least one update option is required");
    });

    it("存在しないファイルで getComponentFile が null を返す場合エラーを返す", async () => {
      // Arrange
      mockGetComponentFile.mockResolvedValue(null);
      const ctx = createCtx({
        action: "update",
        args: ["nonexistent", "--filename", "test.md"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("File not found: nonexistent");
    });

    it("updateComponentFile が ValidationError を throw するケースを処理する", async () => {
      // Arrange
      mockGetComponentFile.mockResolvedValue({
        id: "f1",
        filename: "old.md",
        content: "content",
      });
      mockUpdateComponentFile.mockRejectedValue(
        new ValidationError({
          field: "filename",
          code: "DUPLICATE_FILENAME",
          message: "A file with this filename already exists in this component",
        }),
      );
      const ctx = createCtx({
        action: "update",
        args: ["f1", "--filename", "dup.md"],
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("A file with this filename already exists");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      mockGetComponentFile.mockResolvedValue({
        id: "f1",
        filename: "old.md",
        content: "content",
      });
      const file = { id: "f1", filename: "new.md" };
      mockUpdateComponentFile.mockResolvedValue(file);
      const ctx = createCtx({
        action: "update",
        args: ["f1", "--filename", "new.md"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleUpdate(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("f1");
    });
  });

  describe("handleDelete", () => {
    it("ID 指定でファイルを削除する", async () => {
      // Arrange
      mockDeleteComponentFile.mockResolvedValue({ id: "f1" });
      const ctx = createCtx({ action: "delete", args: ["f1"] });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockDeleteComponentFile).toHaveBeenCalledWith("f1");
      const output = streams.stdoutData.join("");
      expect(output).toContain("Deleted file: f1");
    });

    it("ID 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({ action: "delete", args: [] });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("File ID is required");
    });

    it("ValidationError 時にエラー出力する", async () => {
      // Arrange
      mockDeleteComponentFile.mockRejectedValue(
        new ValidationError({
          field: "id",
          code: "FILE_NOT_FOUND",
          message: "Component file not found",
        }),
      );
      const ctx = createCtx({ action: "delete", args: ["nonexistent"] });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Component file not found");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const file = { id: "f1" };
      mockDeleteComponentFile.mockResolvedValue(file);
      const ctx = createCtx({
        action: "delete",
        args: ["f1"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleDelete(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("f1");
    });
  });
});
