import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutputStreams } from "../../output";
import type { CommandContext } from "../../types";

// plugins.server のモック
vi.mock("../../../app/lib/plugins.server", () => ({
  addAgentTeamMember: vi.fn(),
  removeAgentTeamMember: vi.fn(),
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
  addAgentTeamMember,
  removeAgentTeamMember,
} from "../../../app/lib/plugins.server";
import { ValidationError } from "../../../app/lib/validations";
import {
  handleAdd,
  handleRemove,
  setOutputStreams,
} from "../team";

// モック関数の型キャスト
const mockAddAgentTeamMember = addAgentTeamMember as ReturnType<typeof vi.fn>;
const mockRemoveAgentTeamMember = removeAgentTeamMember as ReturnType<typeof vi.fn>;

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
    entity: "team",
    action: "",
    args: [],
    options: { json: false, help: false, version: false },
    ...overrides,
  };
}

describe("team コマンド", () => {
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
    it("正常にチームメンバーを追加する", async () => {
      // Arrange
      mockAddAgentTeamMember.mockResolvedValue({ id: "tm1" });
      const ctx = createCtx({
        action: "add",
        args: ["--team", "c1", "--member", "c2"],
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("Added team member: tm1");
    });

    it("addAgentTeamMember を正しい引数で呼び出す", async () => {
      // Arrange
      mockAddAgentTeamMember.mockResolvedValue({ id: "tm1" });
      const ctx = createCtx({
        action: "add",
        args: ["--team", "team-comp-id", "--member", "member-comp-id"],
      });

      // Act
      await handleAdd(ctx);

      // Assert
      expect(mockAddAgentTeamMember).toHaveBeenCalledWith("team-comp-id", {
        memberComponentId: "member-comp-id",
      });
    });

    it("--team 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "add",
        args: ["--member", "c2"],
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--team is required");
    });

    it("--member 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "add",
        args: ["--team", "c1"],
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--member is required");
    });

    it("重複メンバーで ValidationError を返す", async () => {
      // Arrange
      mockAddAgentTeamMember.mockRejectedValue(
        new ValidationError({
          field: "componentId",
          code: "DUPLICATE_MEMBER",
          message: "This agent is already a member of the team",
        }),
      );
      const ctx = createCtx({
        action: "add",
        args: ["--team", "c1", "--member", "c2"],
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("This agent is already a member of the team");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const result = { id: "tm1" };
      mockAddAgentTeamMember.mockResolvedValue(result);
      const ctx = createCtx({
        action: "add",
        args: ["--team", "c1", "--member", "c2"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleAdd(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("tm1");
    });
  });

  describe("handleRemove", () => {
    it("正常にチームメンバーを削除する", async () => {
      // Arrange
      mockRemoveAgentTeamMember.mockResolvedValue({ id: "tm1" });
      const ctx = createCtx({
        action: "remove",
        args: ["--team", "c1", "--member", "tm1"],
      });

      // Act
      const exitCode = await handleRemove(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      expect(output).toContain("Removed team member: tm1");
    });

    it("removeAgentTeamMember を正しい引数順序で呼び出す", async () => {
      // Arrange
      mockRemoveAgentTeamMember.mockResolvedValue({ id: "member-id" });
      const ctx = createCtx({
        action: "remove",
        args: ["--team", "team-comp-id", "--member", "member-id"],
      });

      // Act
      await handleRemove(ctx);

      // Assert: 第1引数が memberId、第2引数が agentTeamComponentId
      expect(mockRemoveAgentTeamMember).toHaveBeenCalledWith(
        "member-id",
        "team-comp-id",
      );
    });

    it("--team 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "remove",
        args: ["--member", "tm1"],
      });

      // Act
      const exitCode = await handleRemove(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--team is required");
    });

    it("--member 未指定でエラーを返す", async () => {
      // Arrange
      const ctx = createCtx({
        action: "remove",
        args: ["--team", "c1"],
      });

      // Act
      const exitCode = await handleRemove(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("--member is required");
    });

    it("メンバーが指定チームに属さない場合に通常 Error をハンドリングする", async () => {
      // Arrange
      mockRemoveAgentTeamMember.mockRejectedValue(
        new Error("Member does not belong to the specified agent team component"),
      );
      const ctx = createCtx({
        action: "remove",
        args: ["--team", "c1", "--member", "tm1"],
      });

      // Act
      const exitCode = await handleRemove(ctx);

      // Assert
      expect(exitCode).toBe(1);
      const output = streams.stderrData.join("");
      expect(output).toContain("Member does not belong to the specified agent team component");
    });

    it("--json で JSON 出力する", async () => {
      // Arrange
      const result = { id: "tm1" };
      mockRemoveAgentTeamMember.mockResolvedValue(result);
      const ctx = createCtx({
        action: "remove",
        args: ["--team", "c1", "--member", "tm1"],
        options: { json: true, help: false, version: false },
      });

      // Act
      const exitCode = await handleRemove(ctx);

      // Assert
      expect(exitCode).toBe(0);
      const output = streams.stdoutData.join("");
      const parsed = JSON.parse(output);
      expect(parsed.ok).toBe(true);
      expect(parsed.data.id).toBe("tm1");
    });
  });
});
