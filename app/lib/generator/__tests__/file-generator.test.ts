import { describe, expect, it } from "vitest";
import { generateSupportFiles } from "../file-generator.server";

describe("generateSupportFiles", () => {
  it("サポートファイルを正しく生成すること", () => {
    const files = generateSupportFiles(
      "skills/my-skill",
      [
        { filename: "template.md", content: "# Template\n" },
        { filename: "reference.md", content: "# Reference\n" },
      ],
      "my-skill",
    );

    expect(files).toHaveLength(2);
    expect(files[0].path).toBe("skills/my-skill/template.md");
    expect(files[0].content).toBe("# Template\n");
    expect(files[0].skillName).toBe("my-skill");
    expect(files[1].path).toBe("skills/my-skill/reference.md");
  });

  it("空配列の場合に空配列を返すこと", () => {
    const files = generateSupportFiles("skills/empty", [], "empty-skill");

    expect(files).toEqual([]);
  });

  it("安全でないファイル名をフィルタリングすること", () => {
    const files = generateSupportFiles(
      "skills/test",
      [
        { filename: "../escape.md", content: "bad\n" },
        { filename: "/absolute.md", content: "bad\n" },
        { filename: "safe.md", content: "good\n" },
      ],
      "test-skill",
    );

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("skills/test/safe.md");
  });

  it("末尾改行がないコンテンツに改行を自動付与すること", () => {
    const files = generateSupportFiles(
      "skills/test",
      [{ filename: "no-newline.md", content: "no newline" }],
      "test-skill",
    );

    expect(files[0].content).toBe("no newline\n");
  });

  it("末尾改行があるコンテンツには改行を重複付与しないこと", () => {
    const files = generateSupportFiles(
      "skills/test",
      [{ filename: "has-newline.md", content: "has newline\n" }],
      "test-skill",
    );

    expect(files[0].content).toBe("has newline\n");
  });
});
