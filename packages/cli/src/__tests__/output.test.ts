import { describe, expect, it } from "vitest";
import type { CliError } from "../errors";
import { type OutputStreams, createOutput } from "../output";

// テスト用の出力ストリームを作成するヘルパー
function createMockStreams(): OutputStreams & {
  stdoutData: string[];
  stderrData: string[];
} {
  const stdoutData: string[] = [];
  const stderrData: string[] = [];
  return {
    stdout: {
      write: (s: string) => {
        stdoutData.push(s);
      },
    },
    stderr: {
      write: (s: string) => {
        stderrData.push(s);
      },
    },
    stdoutData,
    stderrData,
  };
}

describe("createOutput", () => {
  describe("JSON モード", () => {
    it("success で { ok: true, data } を JSON 出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: true }, streams);

      // Act
      output.success({ name: "test" });

      // Assert
      expect(streams.stdoutData).toHaveLength(1);
      expect(JSON.parse(streams.stdoutData[0])).toEqual({
        ok: true,
        data: { name: "test" },
      });
    });

    it("success で文字列データも JSON でラップする", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: true }, streams);

      // Act
      output.success("hello");

      // Assert
      expect(JSON.parse(streams.stdoutData[0])).toEqual({
        ok: true,
        data: "hello",
      });
    });

    it("error で単一エラーを { ok: false, errors: [...] } として JSON 出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: true }, streams);
      const error: CliError = {
        type: "validation",
        message: "something went wrong",
      };

      // Act
      output.error(error);

      // Assert
      expect(streams.stdoutData).toHaveLength(1);
      expect(JSON.parse(streams.stdoutData[0])).toEqual({
        ok: false,
        errors: [{ type: "validation", message: "something went wrong" }],
      });
      // stderr には出力しない
      expect(streams.stderrData).toHaveLength(0);
    });

    it("error で複数エラーを { ok: false, errors: [...] } として JSON 出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: true }, streams);
      const errors: CliError[] = [
        { type: "validation", message: "入力が不正です" },
        {
          type: "io",
          message: "ファイルが見つかりません",
          context: "/tmp/foo.ts",
        },
      ];

      // Act
      output.error(errors);

      // Assert
      expect(streams.stdoutData).toHaveLength(1);
      expect(JSON.parse(streams.stdoutData[0])).toEqual({
        ok: false,
        errors: [
          { type: "validation", message: "入力が不正です" },
          {
            type: "io",
            message: "ファイルが見つかりません",
            context: "/tmp/foo.ts",
          },
        ],
      });
    });
  });

  describe("通常モード", () => {
    it("success で文字列をそのまま stdout に出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: false }, streams);

      // Act
      output.success("Operation completed");

      // Assert
      expect(streams.stdoutData).toHaveLength(1);
      expect(streams.stdoutData[0]).toBe("Operation completed\n");
    });

    it("success でオブジェクトを整形 JSON として stdout に出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: false }, streams);

      // Act
      output.success({ count: 3 });

      // Assert
      expect(streams.stdoutData).toHaveLength(1);
      expect(streams.stdoutData[0]).toBe('{\n  "count": 3\n}\n');
    });

    it("error で単一エラーを Error [type]: message 形式で stderr に出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: false }, streams);
      const error: CliError = { type: "io", message: "not found" };

      // Act
      output.error(error);

      // Assert
      expect(streams.stderrData).toHaveLength(1);
      expect(streams.stderrData[0]).toBe("Error [io]: not found\n");
      // stdout には出力しない
      expect(streams.stdoutData).toHaveLength(0);
    });

    it("error で context 付きエラーを Error [type]: message (context) 形式で出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: false }, streams);
      const error: CliError = {
        type: "io",
        message: "ファイルが見つかりません",
        context: "/tmp/foo.ts",
      };

      // Act
      output.error(error);

      // Assert
      expect(streams.stderrData).toHaveLength(1);
      expect(streams.stderrData[0]).toBe(
        "Error [io]: ファイルが見つかりません (/tmp/foo.ts)\n",
      );
    });

    it("error で複数エラーをそれぞれ stderr に出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: false }, streams);
      const errors: CliError[] = [
        { type: "validation", message: "エラー1" },
        { type: "execution", message: "エラー2" },
      ];

      // Act
      output.error(errors);

      // Assert
      expect(streams.stderrData).toHaveLength(2);
      expect(streams.stderrData[0]).toBe("Error [validation]: エラー1\n");
      expect(streams.stderrData[1]).toBe("Error [execution]: エラー2\n");
    });
  });
});
