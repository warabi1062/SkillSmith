import { describe, expect, it } from "vitest";
import {
  renderListSection,
  renderSections,
} from "../section-utils";
import type { LoadedSection } from "../../types/loaded";

describe("renderSections", () => {
  it("セクション配列をMarkdown形式でレンダリングする", () => {
    const sections: LoadedSection[] = [
      { heading: "前提条件", body: "条件Aを満たすこと。" },
      { heading: "注意事項", body: "注意内容。" },
    ];

    const result = renderSections(sections);

    expect(result).toEqual([
      "",
      "## 前提条件",
      "",
      "条件Aを満たすこと。",
      "",
      "## 注意事項",
      "",
      "注意内容。",
    ]);
  });

  it("空配列を渡した場合は空配列を返す", () => {
    expect(renderSections([])).toEqual([]);
  });
});

describe("renderListSection", () => {
  it("items が指定されている場合、先頭に空行を含むセクションを返す", () => {
    const result = renderListSection("入力", ["タスクID", "ブランチ名"]);

    expect(result).toEqual(["", "## 入力", "", "- タスクID", "- ブランチ名"]);
  });

  it("items が空配列の場合は空配列を返す", () => {
    expect(renderListSection("入力", [])).toEqual([]);
  });

  it("items が undefined の場合は空配列を返す", () => {
    expect(renderListSection("入力", undefined)).toEqual([]);
  });
});
