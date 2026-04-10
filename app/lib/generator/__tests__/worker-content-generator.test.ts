import { describe, it, expect } from "vitest";
import { generateWorkerContent } from "../worker-content-generator.server";
import type { WorkerContentInput } from "../worker-content-generator.server";

function makeInput(
  overrides?: Partial<WorkerContentInput>,
): WorkerContentInput {
  return {
    input: ["チケットID"],
    output: ["結果のファイルパス"],
    workerSteps: [
      { id: "1", title: "計画の読み込み", body: "計画ファイルを読み込む。" },
      { id: "2", title: "実行", body: "計画に従って実行する。" },
    ],
    ...overrides,
  };
}

describe("generateWorkerContent", () => {
  it("入力セクションが生成される", () => {
    const result = generateWorkerContent(makeInput());

    expect(result).toContain("## 入力");
    expect(result).toContain("チケットID");
  });

  it("入力がない場合は入力セクションが省略される", () => {
    const result = generateWorkerContent(makeInput({ input: undefined }));

    expect(result).not.toContain("## 入力");
  });

  it("手順セクションにステップが含まれる", () => {
    const result = generateWorkerContent(makeInput());

    expect(result).toContain("## 手順");
    expect(result).toContain("### 1. 計画の読み込み");
    expect(result).toContain("計画ファイルを読み込む。");
    expect(result).toContain("### 2. 実行");
    expect(result).toContain("計画に従って実行する。");
  });

  it("出力セクションが生成される", () => {
    const result = generateWorkerContent(makeInput());

    expect(result).toContain("## 出力");
    expect(result).toContain("結果のファイルパス");
  });

  it("出力がない場合は出力セクションが省略される", () => {
    const result = generateWorkerContent(makeInput({ output: undefined }));

    expect(result).not.toContain("## 出力");
  });

  it("beforeSectionsがstepsの前に配置される", () => {
    const result = generateWorkerContent(
      makeInput({
        beforeSections: [
          { heading: "前提条件", body: "必要な前提条件の説明。" },
        ],
      }),
    );

    const beforeIdx = result.indexOf("## 前提条件");
    const stepsIdx = result.indexOf("## 手順");
    expect(beforeIdx).toBeGreaterThan(-1);
    expect(stepsIdx).toBeGreaterThan(-1);
    expect(beforeIdx).toBeLessThan(stepsIdx);
  });

  it("afterSectionsがstepsの後に配置される", () => {
    const result = generateWorkerContent(
      makeInput({
        afterSections: [{ heading: "注意事項", body: "注意事項の説明。" }],
      }),
    );

    const stepsIdx = result.indexOf("## 手順");
    const afterIdx = result.indexOf("## 注意事項");
    expect(stepsIdx).toBeGreaterThan(-1);
    expect(afterIdx).toBeGreaterThan(-1);
    expect(afterIdx).toBeGreaterThan(stepsIdx);
  });

  it("ステップが空の場合は手順セクションが省略される", () => {
    const result = generateWorkerContent(makeInput({ workerSteps: [] }));

    expect(result).not.toContain("## 手順");
  });
});
