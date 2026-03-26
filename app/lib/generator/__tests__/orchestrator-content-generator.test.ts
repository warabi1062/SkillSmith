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

  it("InlineStep（steps/input/output あり）の場合", () => {
    const steps: LoadedStep[] = [
      {
        inline: "タスクID生成",
        steps: [
          { id: "1", title: "slug生成", body: "指示内容から短いslugを生成する" },
        ],
        input: "ユーザー指示",
        output: "タスクID: quick-{slug}",
      },
    ];

    const result = generateOrchestratorContent({
      name: "test",
      steps,
    });

    expect(result).toContain("### Step 1: タスクID生成");
    expect(result).toContain("#### 手順");
    expect(result).toContain("**1. slug生成**");
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
          "モードB": [{ inline: "手動処理", steps: [{ id: "1", title: "処理実行", body: "手動で処理する" }] }],
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

  it("InlineStep に複数の steps がある場合、構造化された手順が出力される", () => {
    const steps: LoadedStep[] = [
      {
        inline: "ブランチ作成",
        steps: [
          { id: "1", title: "ベースブランチ判定", body: "git branch -a で develop の存在を確認する" },
          { id: "2", title: "ブランチ切り替え", body: "feature/{タスクID} ブランチを作成して切り替える" },
        ],
      },
    ];

    const result = generateOrchestratorContent({
      name: "test",
      steps,
    });

    expect(result).toContain("### Step 1: ブランチ作成");
    expect(result).toContain("#### 手順");
    expect(result).toContain("**1. ベースブランチ判定**");
    expect(result).toContain("git branch -a で develop の存在を確認する");
    expect(result).toContain("**2. ブランチ切り替え**");
    expect(result).toContain("feature/{タスクID} ブランチを作成して切り替える");
  });

  it("InlineStep に tools がある場合、使用ツールが出力される", () => {
    const steps: LoadedStep[] = [
      {
        inline: "コード検索",
        steps: [
          { id: "1", title: "検索実行", body: "関連ファイルを検索する" },
        ],
        tools: ["Grep", "Glob", "Read"],
      },
    ];

    const result = generateOrchestratorContent({
      name: "test",
      steps,
    });

    expect(result).toContain("### Step 1: コード検索");
    expect(result).toContain("**使用ツール**: Grep, Glob, Read");
  });

  it("InlineStep に steps が空配列の場合、手順セクションが出力されない", () => {
    const steps: LoadedStep[] = [
      {
        inline: "シンプル処理",
        steps: [],
        input: "入力データ",
        output: "出力結果",
      },
    ];

    const result = generateOrchestratorContent({
      name: "test",
      steps,
    });

    expect(result).toContain("### Step 1: シンプル処理");
    expect(result).toContain("**入力**: 入力データ");
    expect(result).toContain("**出力**: 出力結果");
    expect(result).not.toContain("#### 手順");
  });

  it("before-step:0 を指定したセクションが Step 1 の直前に表示される", () => {
    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a", "worker-b"],
      sections: [
        { heading: "Step1の前", body: "Step1前のコンテンツ", position: "before-step:0" },
      ],
    });

    const sectionIdx = result.indexOf("## Step1の前");
    const step1Idx = result.indexOf("### Step 1: worker-a");
    expect(sectionIdx).toBeGreaterThan(-1);
    expect(step1Idx).toBeGreaterThan(-1);
    expect(sectionIdx).toBeLessThan(step1Idx);
  });

  it("after-step:0 を指定したセクションが Step 1 の直後に表示される", () => {
    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a", "worker-b"],
      sections: [
        { heading: "Step1の後", body: "Step1後のコンテンツ", position: "after-step:0" },
      ],
    });

    const step1Idx = result.indexOf("### Step 1: worker-a");
    const sectionIdx = result.indexOf("## Step1の後");
    const step2Idx = result.indexOf("### Step 2: worker-b");
    expect(step1Idx).toBeLessThan(sectionIdx);
    expect(sectionIdx).toBeLessThan(step2Idx);
  });

  it("after-step:1 を指定したセクションが Step 2 の直後に表示される", () => {
    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a", "worker-b", "worker-c"],
      sections: [
        { heading: "Step2の後", body: "Step2後のコンテンツ", position: "after-step:1" },
      ],
    });

    const step2Idx = result.indexOf("### Step 2: worker-b");
    const sectionIdx = result.indexOf("## Step2の後");
    const step3Idx = result.indexOf("### Step 3: worker-c");
    expect(step2Idx).toBeLessThan(sectionIdx);
    expect(sectionIdx).toBeLessThan(step3Idx);
  });

  it("範囲外の index を指定した場合 after-steps にフォールバックする", () => {
    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a"],
      sections: [
        { heading: "範囲外", body: "フォールバックコンテンツ", position: "before-step:99" },
      ],
    });

    const stepIdx = result.indexOf("### Step 1: worker-a");
    const sectionIdx = result.indexOf("## 範囲外");
    expect(stepIdx).toBeLessThan(sectionIdx);
  });

  it("before-steps / after-steps と step間セクションが混在する場合", () => {
    const result = generateOrchestratorContent({
      name: "test",
      steps: ["worker-a", "worker-b"],
      sections: [
        { heading: "事前確認", body: "確認事項", position: "before-steps" },
        { heading: "Step間メモ", body: "メモ内容", position: "after-step:0" },
        { heading: "注意事項", body: "注意内容", position: "after-steps" },
      ],
    });

    const beforeIdx = result.indexOf("## 事前確認");
    const stepsIdx = result.indexOf("## ステップ");
    const step1Idx = result.indexOf("### Step 1: worker-a");
    const betweenIdx = result.indexOf("## Step間メモ");
    const step2Idx = result.indexOf("### Step 2: worker-b");
    const afterIdx = result.indexOf("## 注意事項");

    expect(beforeIdx).toBeLessThan(stepsIdx);
    expect(step1Idx).toBeLessThan(betweenIdx);
    expect(betweenIdx).toBeLessThan(step2Idx);
    expect(step2Idx).toBeLessThan(afterIdx);
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
});
