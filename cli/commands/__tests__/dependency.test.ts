import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutputStreams } from "../../output";
import type { CommandContext } from "../../types";

// plugins.server のモック
vi.mock("../../../app/lib/plugins.server", () => ({
  createDependency: vi.fn(),
  deleteDependency: vi.fn(),
  reorderDependency: vi.fn(),
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
  createDependency,
  deleteDependency,
  reorderDependency,
} from "../../../app/lib/plugins.server";
import { ValidationError } from "../../../app/lib/validations";
import {
  handleAdd,
  handleRemove,
  handleReorder,
  setOutputStreams,
} from "../dependency";

// モック関数の型キャスト
const mockCreateDependency = createDependency as ReturnType<typeof vi.fn>;
const mockDeleteDependency = deleteDependency as ReturnType<typeof vi.fn>;
const mockReorderDependency = reorderDependency as ReturnType<typeof vi.fn>;

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
    entity: "dependency",
    action: "",
    args: [],
    options: { json: false, help: false, version: false },
    ...overrides,
  };
}

describe("dependency コマンド", () => {
  let streams: ReturnType<typeof createMockStreams>;

  beforeEach(() => {
    streams = createMockStreams();
    setOutputStreams(streams);
  });

  afterEach(() => {
    setOutputStreams(undefined);
    vi.resetAllMocks();
  });

  describe("handleAdd", () => {
    it("正常に依存関係を追加する", async () => {
      // Arrange
      mockCreateDependency.mockResolvedValue({ id: "d1" });
      const ctx = createCtx({
        action: "add",
        args: ["--source", "c1", "--target", "c2"],
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockCreateDependency).toHaveBeenCalledWith({
        sourceId: "c1",
        targetId: "c2",
      });
      const output = streams.stdoutData.join("");
      expect(output).toContain("Added dependency: d1");
    });

    it("--source 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "add",
        args: ["--target", "c2"],
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--source is required");
    });

    it("--target 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "add",
        args: ["--source", "c1"],
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--target is required");
    });

    it("重複依存で ValidationError を返す", async () => {
      // Arrange
      mockCreateDependency.mockRejectedValue(
        new ValidationError({
          field: "dependency",
          code: "DUPLICATE_DEPENDENCY",
          message: "This dependency already exists",
        }),
      );
      const ctx = createCtx({
        action: "add",
        args: ["--source", "c1", "--target", "c2"],
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("This dependency already exists");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const dependency = { id: "d1" };
      mockCreateDependency.mockResolvedValue(dependency);
      const ctx = createCtx({
        action: "add",
        args: ["--source", "c1", "--target", "c2"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("d1");
    });
  });

  describe("handleRemove", () => {
    it("正常に依存関係を削除する", async () => {
      // Arrange
      mockDeleteDependency.mockResolvedValue({ id: "d1" });
      const ctx = createCtx({ action: "remove", args: ["d1"] });

      // Act
      const exitCode = await handleRemove(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockDeleteDependency).toHaveBeenCalledWith("d1");
      const output = streams.stdoutData.join("");
      expect(output).toContain("Removed dependency: d1");
    });

    it("ID 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({ action: "remove", args: [] });

      // Act
      const exitCode = await handleRemove(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Dependency ID is required");
    });

    it("存在しない ID で Prisma P2025 エラーを返す", async () => {
      // Arrange
      const error = new Error("Record not found");
      (error as unknown as { code: string }).code = "P2025";
      mockDeleteDependency.mockRejectedValue(error);
      const ctx = createCtx({ action: "remove", args: ["nonexistent"] });

      // Act
      const exitCode = await handleRemove(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Dependency not found");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      mockDeleteDependency.mockResolvedValue({ id: "d1" });
      const ctx = createCtx({
        action: "remove",
        args: ["d1"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleRemove(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("d1");
    });
  });

  describe("handleReorder", () => {
    it("正常に依存関係の順序を変更する", async () => {
      // Arrange
      mockReorderDependency.mockResolvedValue(undefined);
      const ctx = createCtx({
        action: "reorder",
        args: ["d1", "--direction", "up"],
      });

      // Act
      const exitCode = await handleReorder(ctx);

      // Assert
      expect(exitCode).toBe(0);
      expect(mockReorderDependency).toHaveBeenCalledWith("d1", "up");
      const output = streams.stdoutData.join("");
      expect(output).toContain("Reordered dependency: d1 (up)");
    });

    it("ID 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "reorder",
        args: ["--direction", "up"],
      });

      // Act
      const exitCode = await handleReorder(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Dependency ID is required");
    });

    it("--direction 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "reorder",
        args: ["d1"],
      });

      // Act
      const exitCode = await handleReorder(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--direction is required");
    });

    it("不正な direction でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "reorder",
        args: ["d1", "--direction", "sideways"],
      });

      // Act
      const exitCode = await handleReorder(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Invalid --direction: sideways");
      expect(output).toContain("up");
      expect(output).toContain("down");
    });

    it("存在しない ID で ValidationError を返す", async () => {
      // Arrange
      mockReorderDependency.mockRejectedValue(
        new ValidationError({
          field: "id",
          code: "DEPENDENCY_NOT_FOUND",
          message: "Dependency not found",
        }),
      );
      const ctx = createCtx({
        action: "reorder",
        args: ["nonexistent", "--direction", "up"],
      });

      // Act
      const exitCode = await handleReorder(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Dependency not found");
    });

    it("境界（端）で成功メッセージを出力する", async () => {
      // Arrange: reorderDependency は境界到達時に undefined を返す
      mockReorderDependency.mockResolvedValue(undefined);
      const ctx = createCtx({
        action: "reorder",
        args: ["d1", "--direction", "down"],
      });

      // Act
      const exitCode = await handleReorder(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("Reordered dependency: d1 (down)");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      mockReorderDependency.mockResolvedValue(undefined);
      const ctx = createCtx({
        action: "reorder",
        args: ["d1", "--direction", "up"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleReorder(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("d1");
      expect(parsed.data.direction).toBe("up");
    });
  });
});
