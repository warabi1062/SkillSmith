import { describe, expect, it } from "vitest";
import { parseGlobalArgs } from "../router";

describe("parseGlobalArgs", () => {
  it("引数なしでデフォルト値を返す", () => {
    // Arrange & Act
    const result = parseGlobalArgs([]);

    // Assert
    expect(result.options).toEqual({
      json: false,
      help: false,
      version: false,
    });
    expect(result.positionals).toEqual([]);
    expect(result.rest).toEqual([]);
  });

  it("entity と action を positionals として抽出する", () => {
    // Arrange & Act
    const result = parseGlobalArgs(["plugin", "export"]);

    // Assert
    expect(result.positionals[0]).toBe("plugin");
    expect(result.positionals[1]).toBe("export");
    expect(result.rest).toEqual([]);
  });

  it("--json フラグを認識する", () => {
    // Arrange & Act
    const result = parseGlobalArgs(["--json", "plugin", "list"]);

    // Assert
    expect(result.options.json).toBe(true);
    expect(result.positionals[0]).toBe("plugin");
  });

  it("--help フラグを認識する", () => {
    // Arrange & Act
    const result = parseGlobalArgs(["--help"]);

    // Assert
    expect(result.options.help).toBe(true);
  });

  it("--version フラグを認識する", () => {
    // Arrange & Act
    const result = parseGlobalArgs(["--version"]);

    // Assert
    expect(result.options.version).toBe(true);
  });

  it("entity の後の --help も認識する", () => {
    // Arrange & Act
    const result = parseGlobalArgs(["plugin", "--help"]);

    // Assert
    expect(result.options.help).toBe(true);
    expect(result.positionals[0]).toBe("plugin");
  });

  it("entity/action の後の残余引数を rest に含める", () => {
    // Arrange & Act
    const result = parseGlobalArgs(["plugin", "export", "my-plugin"]);

    // Assert
    expect(result.positionals[0]).toBe("plugin");
    expect(result.positionals[1]).toBe("export");
    expect(result.rest).toContain("my-plugin");
  });

  it("複数のグローバルフラグを同時に認識する", () => {
    // Arrange & Act
    const result = parseGlobalArgs(["--json", "--help"]);

    // Assert
    expect(result.options.json).toBe(true);
    expect(result.options.help).toBe(true);
  });

  it("未知オプション引数（--name value 形式）を rest に含める", () => {
    // Arrange & Act
    const result = parseGlobalArgs(["plugin", "create", "--name", "test"]);

    // Assert
    expect(result.positionals[0]).toBe("plugin");
    expect(result.positionals[1]).toBe("create");
    expect(result.rest).toEqual(["--name", "test"]);
  });

  it("未知オプション引数（--name=value 形式）を rest に含める", () => {
    // Arrange & Act
    const result = parseGlobalArgs(["plugin", "update", "abc", "--name=test"]);

    // Assert
    expect(result.positionals[0]).toBe("plugin");
    expect(result.positionals[1]).toBe("update");
    expect(result.rest).toEqual(["abc", "--name=test"]);
  });

  it("グローバルオプションは rest に含めない", () => {
    // Arrange & Act
    const result = parseGlobalArgs([
      "--json",
      "plugin",
      "create",
      "--name",
      "test",
    ]);

    // Assert
    expect(result.options.json).toBe(true);
    expect(result.rest).toEqual(["--name", "test"]);
  });
});
