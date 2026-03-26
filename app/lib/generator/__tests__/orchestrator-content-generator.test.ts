import { describe, it, expect } from "vitest";
import { generateOrchestratorContent } from "../orchestrator-content-generator";
import type { LoadedStep } from "../../types/loader.server";

describe("generateOrchestratorContent", () => {
  it("name + description のみ（steps が空配列）の場合", () => {
    const result = generateOrchestratorContent({
      name: "test-skill",
      description: "テスト用スキル",
      steps: [],
    });

    expect(result).toBe("# test-skill\n\nテスト用スキル");
  });

  it("Skill参照ステップのみの場合", () => {
    const result = generateOrchestratorContent({
      name: "orchestrator",
      steps: ["worker-a", "worker-b"],
    });

    expect(result).toContain("## ステップ");
    expect(result).toContain("### Step 1: worker-a");
    expect(result).toContain("### Step 2: worker-b");
  });

  it("InlineStep（description/input/output あり）の場合", () => {
    const steps: LoadedStep[] = [
      {
        inline: "タスクID生成",
        description: "指示内容から短いslugを生成する",
        input: "ユーザー指示",
        output: "タスクID: quick-{slug}",
      },
    ];

    const result = generateOrchestratorContent({
      name: "test",
      steps,
    });

    expect(result).toContain("### Step 1: タスクID生成");
    expect(result).toContain("指示内容から短いslugを生成する");
    expect(result).toContain("**入力**: ユーザー指示");
    expect(result).toContain("**出力**: タスクID: quick-{slug}");
  });

  it("Branch（description あり + 各 case にステップあり）の場合", () => {
    const steps: LoadedStep[] = [
      {
        decisionPoint: "入力判定",
        description: "入力パターンに応じて分岐する",
        cases: {
          "モードA": ["worker-a"],
          "モードB": [{ inline: "手動処理" }],
        },
      },
    ];

    const result = generateOrchestratorContent({
      name: "test",
      steps,
    });

    expect(result).toContain("### Step 1: 入力判定");
    expect(result).toContain("入力パターンに応じて分岐する");
    expect(result).toContain("#### モードA");
    expect(result).toContain("### Step 1.1: worker-a");
    expect(result).toContain("#### モードB");
    expect(result).toContain("### Step 1.1: 手動処理");
  });

  it("sections（before-steps / after-steps）が正しい位置に出力される", () => {
    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a"],
      sections: [
        { heading: "事前確認", body: "確認事項", position: "before-steps" },
        { heading: "注意事項", body: "注意内容", position: "after-steps" },
      ],
    });

    const beforeIdx = result.indexOf("## 事前確認");
    const stepsIdx = result.indexOf("## ステップ");
    const afterIdx = result.indexOf("## 注意事項");

    expect(beforeIdx).toBeLessThan(stepsIdx);
    expect(stepsIdx).toBeLessThan(afterIdx);
    expect(result).toContain("確認事項");
    expect(result).toContain("注意内容");
  });

  it("ネストした Branch のステップ番号が正しい", () => {
    const steps: LoadedStep[] = [
      "worker-a",
      {
        decisionPoint: "分岐1",
        cases: {
          "ケースA": [
            "worker-b",
            {
              decisionPoint: "分岐2",
              cases: {
                "サブケース": ["worker-c"],
              },
            },
          ],
        },
      },
    ];

    const result = generateOrchestratorContent({
      name: "test",
      steps,
    });

    expect(result).toContain("### Step 1: worker-a");
    expect(result).toContain("### Step 2: 分岐1");
    expect(result).toContain("### Step 2.1: worker-b");
    expect(result).toContain("### Step 2.2: 分岐2");
    expect(result).toContain("### Step 2.2.1: worker-c");
  });

  it("skillDescriptions から Worker skill の description が引用される", () => {
    const skillDescriptions = new Map<string, string>();
    skillDescriptions.set("worker-a", "Worker Aの説明文");

    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a"],
      skillDescriptions,
    });

    expect(result).toContain("### Step 1: worker-a");
    expect(result).toContain("Worker Aの説明文");
  });

  it("skillDescriptions に該当スキルが無い場合、スキル名のみがフォールバック出力される", () => {
    const skillDescriptions = new Map<string, string>();
    skillDescriptions.set("other-skill", "別スキルの説明");

    const result = generateOrchestratorContent({
      name: "test",
      steps: ["unknown-skill"],
      skillDescriptions,
    });

    expect(result).toContain("### Step 1: unknown-skill");
    // description が含まれないこと
    expect(result).not.toContain("別スキルの説明");
    // スキル名行の後に説明がないことを確認
    const lines = result.split("\n");
    const stepLine = lines.findIndex(l => l.includes("### Step 1: unknown-skill"));
    // ステップ行の次は空行またはファイル末尾
    const nextNonEmpty = lines.slice(stepLine + 1).find(l => l.trim() !== "");
    expect(nextNonEmpty).toBeUndefined();
  });
  it("before-step position のセクションが指定ステップの前に挿入される", () => {
    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a", "worker-b", "worker-c"],
      sections: [
        { heading: "中間メモ", body: "step-1の前のメモ", position: "before-step:1" },
      ],
    });

    const stepAIdx = result.indexOf("### Step 1: worker-a");
    const sectionIdx = result.indexOf("## 中間メモ");
    const stepBIdx = result.indexOf("### Step 2: worker-b");

    expect(sectionIdx).toBeGreaterThan(stepAIdx);
    expect(sectionIdx).toBeLessThan(stepBIdx);
    expect(result).toContain("step-1の前のメモ");
  });

  it("after-step position のセクションが指定ステップの後に挿入される", () => {
    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a", "worker-b"],
      sections: [
        { heading: "ステップ後注記", body: "step-0の後の注記", position: "after-step:0" },
      ],
    });

    const stepAIdx = result.indexOf("### Step 1: worker-a");
    const sectionIdx = result.indexOf("## ステップ後注記");
    const stepBIdx = result.indexOf("### Step 2: worker-b");

    expect(sectionIdx).toBeGreaterThan(stepAIdx);
    expect(sectionIdx).toBeLessThan(stepBIdx);
    expect(result).toContain("step-0の後の注記");
  });

  it("before-steps / after-steps / before-step / after-step が混在しても正しい順序になる", () => {
    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a", "worker-b"],
      sections: [
        { heading: "全体前", body: "全体前の内容", position: "before-steps" },
        { heading: "全体後", body: "全体後の内容", position: "after-steps" },
        { heading: "step間", body: "step間の内容", position: "after-step:0" },
      ],
    });

    const beforeAllIdx = result.indexOf("## 全体前");
    const stepsIdx = result.indexOf("## ステップ");
    const stepAIdx = result.indexOf("### Step 1: worker-a");
    const midIdx = result.indexOf("## step間");
    const stepBIdx = result.indexOf("### Step 2: worker-b");
    const afterAllIdx = result.indexOf("## 全体後");

    expect(beforeAllIdx).toBeLessThan(stepsIdx);
    expect(stepAIdx).toBeLessThan(midIdx);
    expect(midIdx).toBeLessThan(stepBIdx);
    expect(stepBIdx).toBeLessThan(afterAllIdx);
  });

});