import { describe, expect, it } from "vitest";
import { type OutputStreams, createOutput } from "../output";

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

    it("error で { ok: false, error } を JSON 出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: true }, streams);

      // Act
      output.error("something went wrong");

      // Assert
      expect(streams.stdoutData).toHaveLength(1);
      expect(JSON.parse(streams.stdoutData[0])).toEqual({
        ok: false,
        error: "something went wrong",
      });
      // stderr には出力しない
      expect(streams.stderrData).toHaveLength(0);
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

    it("error でメッセージを stderr に出力する", () => {
      // Arrange
      const streams = createMockStreams();
      const output = createOutput({ json: false }, streams);

      // Act
      output.error("not found");

      // Assert
      expect(streams.stderrData).toHaveLength(1);
      expect(streams.stderrData[0]).toBe("Error: not found\n");
      // stdout には出力しない
      expect(streams.stdoutData).toHaveLength(0);
    });
  });
});
