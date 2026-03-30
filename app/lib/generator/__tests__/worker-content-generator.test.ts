import { describe, it, expect } from "vitest";
import { generateWorkerContent } from "../worker-content-generator";
import type { WorkerContentInput } from "../worker-content-generator";

function makeInput(
  overrides?: Partial<WorkerContentInput>,
): WorkerContentInput {
  return {
    name: "test-worker",
    description: "テスト用ワーカースキル",
    input: "- チケットID",
    output: "- 結果のパス",
    workerSteps: [
      { id: "1", title: "計画の読み込み", body: "計画ファイルを読み込む。" },
      { id: "2", title: "実行", body: "計画に従って実行する。" },
    ],
    ...overrides,
  };
}

describe("generateWorkerContent", () => {
  it("ヘッダーにスキル名とdescriptionが含まれる", () => {
    const result = generateWorkerContent(makeInput());

    expect(result).toContain("# Test Worker");
    expect(result).toContain("テスト用ワーカースキル");
  });

  it("入力セクションが生成される", () => {
    const result = generateWorkerContent(makeInput());

    expect(result).toContain("## 入力");
    expect(result).toContain("- チケットID");
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
    expect(result).toContain("- 結果のパス");
  });

  it("出力がない場合は出力セクションが省略される", () => {
    const result = generateWorkerContent(makeInput({ output: undefined }));

    expect(result).not.toContain("## 出力");
  });

  it("descriptionがない場合は省略される", () => {
    const result = generateWorkerContent(makeInput({ description: undefined }));

    expect(result).toContain("# Test Worker");
    expect(result).not.toContain("テスト用ワーカースキル");
  });

  it("before-stepsセクションがstepsの前に配置される", () => {
    const result = generateWorkerContent(
      makeInput({
        workerSections: [
          {
            heading: "前提条件",
            body: "必要な前提条件の説明。",
            position: "before-steps",
          },
        ],
      }),
    );

    const beforeIdx = result.indexOf("## 前提条件");
    const stepsIdx = result.indexOf("## 手順");
    expect(beforeIdx).toBeGreaterThan(-1);
    expect(stepsIdx).toBeGreaterThan(-1);
    expect(beforeIdx).toBeLessThan(stepsIdx);
  });

  it("after-stepsセクションがstepsの後に配置される", () => {
    const result = generateWorkerContent(
      makeInput({
        workerSections: [
          {
            heading: "注意事項",
            body: "注意事項の説明。",
            position: "after-steps",
          },
        ],
      }),
    );

    const stepsIdx = result.indexOf("## 手順");
    const afterIdx = result.indexOf("## 注意事項");
    expect(stepsIdx).toBeGreaterThan(-1);
    expect(afterIdx).toBeGreaterThan(-1);
    expect(afterIdx).toBeGreaterThan(stepsIdx);
  });

  it("before-step:0 を指定したセクションが最初のステップの直前に表示される", () => {
    const result = generateWorkerContent(
      makeInput({
        workerSections: [
          {
            heading: "ステップ前メモ",
            body: "メモ内容",
            position: "before-step:0",
          },
        ],
      }),
    );

    const sectionIdx = result.indexOf("## ステップ前メモ");
    const step1Idx = result.indexOf("### 1. 計画の読み込み");
    expect(sectionIdx).toBeGreaterThan(-1);
    expect(step1Idx).toBeGreaterThan(-1);
    expect(sectionIdx).toBeLessThan(step1Idx);
  });

  it("after-step:0 を指定したセクションが最初のステップの直後に表示される", () => {
    const result = generateWorkerContent(
      makeInput({
        workerSections: [
          {
            heading: "ステップ間メモ",
            body: "メモ内容",
            position: "after-step:0",
          },
        ],
      }),
    );

    const step1Idx = result.indexOf("### 1. 計画の読み込み");
    const sectionIdx = result.indexOf("## ステップ間メモ");
    const step2Idx = result.indexOf("### 2. 実行");
    expect(step1Idx).toBeLessThan(sectionIdx);
    expect(sectionIdx).toBeLessThan(step2Idx);
  });

  it("範囲外indexのstep間セクションはafter-stepsにフォールバックする", () => {
    const result = generateWorkerContent(
      makeInput({
        workerSections: [
          {
            heading: "範囲外",
            body: "フォールバック",
            position: "after-step:99",
          },
        ],
      }),
    );

    const step2Idx = result.indexOf("### 2. 実行");
    const sectionIdx = result.indexOf("## 範囲外");
    expect(step2Idx).toBeLessThan(sectionIdx);
  });

  it("ステップが空の場合は手順セクションが省略される", () => {
    const result = generateWorkerContent(makeInput({ workerSteps: [] }));

    expect(result).not.toContain("## 手順");
  });
});
