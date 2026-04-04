import { describe, expect, it } from "vitest";
import type { LoadedOrchestratorSection } from "../../types/loaded";
import {
  filterAfterStepsSections,
  filterAllAfterSections,
  filterAllBeforeSections,
  filterBeforeStepsSections,
  filterOutOfRangeStepSections,
} from "../section-utils";

// テスト用のセクションを生成するヘルパー
function section(
  heading: string,
  position: LoadedOrchestratorSection["position"],
): LoadedOrchestratorSection {
  return { heading, body: `${heading}の本文`, position };
}

describe("filterBeforeStepsSections", () => {
  it("before-stepsポジションのセクションのみを返す", () => {
    const sections = [
      section("概要", "before-steps"),
      section("手順後の補足", "after-steps"),
      section("ステップ前", "before-step:0"),
      section("前提条件", "before-steps"),
    ];

    const result = filterBeforeStepsSections(sections);

    expect(result).toHaveLength(2);
    expect(result[0].heading).toBe("概要");
    expect(result[1].heading).toBe("前提条件");
  });

  it("before-stepsが存在しない場合は空配列を返す", () => {
    const sections = [
      section("手順後の補足", "after-steps"),
      section("ステップ前", "before-step:0"),
    ];

    expect(filterBeforeStepsSections(sections)).toEqual([]);
  });

  it("空配列を渡した場合は空配列を返す", () => {
    expect(filterBeforeStepsSections([])).toEqual([]);
  });
});

describe("filterAfterStepsSections", () => {
  it("after-stepsポジションのセクションのみを返す", () => {
    const sections = [
      section("概要", "before-steps"),
      section("注意事項", "after-steps"),
      section("ステップ後", "after-step:1"),
      section("まとめ", "after-steps"),
    ];

    const result = filterAfterStepsSections(sections);

    expect(result).toHaveLength(2);
    expect(result[0].heading).toBe("注意事項");
    expect(result[1].heading).toBe("まとめ");
  });

  it("after-stepsが存在しない場合は空配列を返す", () => {
    const sections = [
      section("概要", "before-steps"),
      section("ステップ前", "before-step:0"),
    ];

    expect(filterAfterStepsSections(sections)).toEqual([]);
  });

  it("空配列を渡した場合は空配列を返す", () => {
    expect(filterAfterStepsSections([])).toEqual([]);
  });
});

describe("filterAllBeforeSections", () => {
  it("before-stepsとbefore-step:*の両方を返す", () => {
    const sections = [
      section("概要", "before-steps"),
      section("ステップ前", "before-step:0"),
      section("手順後の補足", "after-steps"),
      section("前提条件", "before-steps"),
      section("ステップ2前", "before-step:2"),
    ];

    const result = filterAllBeforeSections(sections);

    expect(result).toHaveLength(4);
    expect(result.map((s) => s.heading)).toEqual([
      "概要",
      "ステップ前",
      "前提条件",
      "ステップ2前",
    ]);
  });

  it("該当するセクションがない場合は空配列を返す", () => {
    const sections = [
      section("手順後の補足", "after-steps"),
      section("ステップ後", "after-step:0"),
    ];

    expect(filterAllBeforeSections(sections)).toEqual([]);
  });

  it("空配列を渡した場合は空配列を返す", () => {
    expect(filterAllBeforeSections([])).toEqual([]);
  });
});

describe("filterAllAfterSections", () => {
  it("after-stepsとafter-step:*の両方を返す", () => {
    const sections = [
      section("概要", "before-steps"),
      section("注意事項", "after-steps"),
      section("ステップ後", "after-step:1"),
      section("まとめ", "after-steps"),
      section("ステップ3後", "after-step:3"),
    ];

    const result = filterAllAfterSections(sections);

    expect(result).toHaveLength(4);
    expect(result.map((s) => s.heading)).toEqual([
      "注意事項",
      "ステップ後",
      "まとめ",
      "ステップ3後",
    ]);
  });

  it("該当するセクションがない場合は空配列を返す", () => {
    const sections = [
      section("概要", "before-steps"),
      section("ステップ前", "before-step:0"),
    ];

    expect(filterAllAfterSections(sections)).toEqual([]);
  });

  it("空配列を渡した場合は空配列を返す", () => {
    expect(filterAllAfterSections([])).toEqual([]);
  });
});

describe("filterOutOfRangeStepSections", () => {
  it("stepCount範囲外のindexを持つstep間セクションを返す", () => {
    const sections = [
      section("ステップ0前", "before-step:0"),
      section("ステップ1後", "after-step:1"),
      section("ステップ5前", "before-step:5"), // 範囲外
      section("ステップ10後", "after-step:10"), // 範囲外
      section("概要", "before-steps"), // step間でないので対象外
    ];

    const result = filterOutOfRangeStepSections(sections, 3);

    expect(result).toHaveLength(2);
    expect(result[0].heading).toBe("ステップ5前");
    expect(result[1].heading).toBe("ステップ10後");
  });

  it("stepCountが0の場合、すべてのstep間セクションが範囲外になる", () => {
    const sections = [
      section("ステップ0前", "before-step:0"),
      section("ステップ0後", "after-step:0"),
    ];

    const result = filterOutOfRangeStepSections(sections, 0);

    expect(result).toHaveLength(2);
  });

  it("すべてのstep間セクションが範囲内の場合は空配列を返す", () => {
    const sections = [
      section("ステップ0前", "before-step:0"),
      section("ステップ1後", "after-step:1"),
      section("ステップ2前", "before-step:2"),
    ];

    const result = filterOutOfRangeStepSections(sections, 3);

    expect(result).toEqual([]);
  });

  it("before-steps/after-stepsはstep間セクションでないため対象外", () => {
    const sections = [
      section("概要", "before-steps"),
      section("まとめ", "after-steps"),
    ];

    const result = filterOutOfRangeStepSections(sections, 0);

    expect(result).toEqual([]);
  });

  it("空配列を渡した場合は空配列を返す", () => {
    expect(filterOutOfRangeStepSections([], 5)).toEqual([]);
  });
});
