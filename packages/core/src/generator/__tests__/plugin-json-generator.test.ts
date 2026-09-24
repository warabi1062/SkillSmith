import { describe, expect, it } from "vitest";
import { generatePluginJson } from "../plugin-json-generator.server";
import { ERROR_CODES, FILE_PATHS } from "../../types/constants";

describe("generatePluginJson", () => {
  it("name と description から正しく plugin.json を生成すること", () => {
    const result = generatePluginJson({
      name: "my-plugin",
      description: "テスト用プラグイン",
    });

    expect(result.errors).toHaveLength(0);
    expect(result.file).not.toBeNull();

    const json = JSON.parse(result.file!.content);
    expect(json.name).toBe("my-plugin");
    expect(json.description).toBe("テスト用プラグイン");
    expect(result.file!.path).toBe(FILE_PATHS.PLUGIN_JSON);
  });

  it("description が未指定の場合に description フィールドが省略されること", () => {
    const result = generatePluginJson({ name: "minimal-plugin" });

    expect(result.errors).toHaveLength(0);
    const json = JSON.parse(result.file!.content);
    expect(json.name).toBe("minimal-plugin");
    expect(json.description).toBeUndefined();
  });

  it("name が空文字の場合にエラーを返し file が null であること", () => {
    const result = generatePluginJson({ name: "" });

    expect(result.file).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].severity).toBe("error");
    expect(result.errors[0].code).toBe(ERROR_CODES.MISSING_PLUGIN_NAME);
  });

  it("出力 JSON が末尾改行を含むこと", () => {
    const result = generatePluginJson({ name: "test" });

    expect(result.file!.content.endsWith("\n")).toBe(true);
  });
  it("version / author / homepage / repository / license / keywords を出力すること", () => {
    const result = generatePluginJson({
      name: "full-plugin",
      version: "1.2.3",
      description: "説明",
      author: {
        name: "me",
        email: "me@example.com",
        url: "https://example.com",
      },
      homepage: "https://example.com/docs",
      repository: "https://github.com/me/full-plugin",
      license: "MIT",
      keywords: ["review", "ci"],
    });

    expect(result.errors).toHaveLength(0);
    const json = JSON.parse(result.file!.content);
    expect(json).toEqual({
      name: "full-plugin",
      version: "1.2.3",
      description: "説明",
      author: {
        name: "me",
        email: "me@example.com",
        url: "https://example.com",
      },
      homepage: "https://example.com/docs",
      repository: "https://github.com/me/full-plugin",
      license: "MIT",
      keywords: ["review", "ci"],
    });
  });

  it("keywords が空配列の場合は出力しないこと", () => {
    const result = generatePluginJson({ name: "p", keywords: [] });
    const json = JSON.parse(result.file!.content);
    expect(json.keywords).toBeUndefined();
  });
});
