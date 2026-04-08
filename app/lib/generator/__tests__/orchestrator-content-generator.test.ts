import { describe, it, expect } from "vitest";
import { generateOrchestratorContent } from "../orchestrator-content-generator.server";
import type { LoadedStep } from "../../types/loaded";


describe("generateOrchestratorContent", () => {
  it("stepsが空配列の場合は空文字を返す", () => {
    const result = generateOrchestratorContent({
      steps: [],
    });

    expect(result).toBe("");
  });

  it("Skill参照ステップのみの場合", () => {
    const result = generateOrchestratorContent({

      steps: [{ skillName: "worker-a" }, { skillName: "worker-b" }],
    });

    expect(result).toContain("## 作業詳細");
    expect(result).toContain("### Step 1: worker-a");
    expect(result).toContain("### Step 2: worker-b");
  });

  it("InlineStep（steps/input/output あり）の場合", () => {
    const steps: LoadedStep[] = [
      {
        inline: "タスクID生成",
        steps: [
          {
            id: "1",
            title: "slug生成",
            body: "指示内容から短いslugを生成する",
          },
        ],
        input: ["ユーザー指示"],
        output: ["タスクID: quick-{slug}"],
      },
    ];

    const result = generateOrchestratorContent({

      steps,
    });

    expect(result).toContain("### Step 1: タスクID生成");
    // ステップが1つだけの場合はフラットに展開される
    expect(result).not.toContain("#### 手順");
    expect(result).toContain("指示内容から短いslugを生成する");
    expect(result).toContain("入力:");
    expect(result).toContain("ユーザー指示");
    expect(result).toContain("出力:");
    expect(result).toContain("タスクID: quick-{slug}");
  });

  it("Branch（description あり + 各 case にステップあり）の場合", () => {
    const steps: LoadedStep[] = [
      {
        decisionPoint: "入力判定",
        description: "入力パターンに応じて分岐する",
        cases: {
          モードA: [{ skillName: "worker-a" }],
          モードB: [
            {
              inline: "手動処理",
              steps: [{ id: "1", title: "処理実行", body: "手動で処理する" }],
            },
          ],
        },
      },
    ];

    const result = generateOrchestratorContent({

      steps,
    });

    expect(result).toContain("### Step 1: 入力判定");
    expect(result).toContain("入力パターンに応じて分岐する");
    expect(result).toContain("#### Step 1A: モードA");
    expect(result).toContain("##### Step 1A-1: worker-a");
    expect(result).toContain("#### Step 1B: モードB");
    expect(result).toContain("##### Step 1B-1: 手動処理");
  });

  it("beforeSections / afterSections が正しい位置に出力される", () => {
    const result = generateOrchestratorContent({
      steps: [{ skillName: "worker-a" }],
      beforeSections: [
        { heading: "事前確認", body: "確認事項" },
      ],
      afterSections: [
        { heading: "注意事項", body: "注意内容" },
      ],
    });

    const beforeIdx = result.indexOf("## 事前確認");
    const stepsIdx = result.indexOf("## 作業詳細");
    const afterIdx = result.indexOf("### 注意事項");

    expect(beforeIdx).toBeLessThan(stepsIdx);
    expect(stepsIdx).toBeLessThan(afterIdx);
    expect(result).toContain("確認事項");
    expect(result).toContain("注意内容");
  });

  it("ネストした Branch のステップ番号が正しい", () => {
    const steps: LoadedStep[] = [
      { skillName: "worker-a" },
      {
        decisionPoint: "分岐1",
        cases: {
          ケースA: [
            { skillName: "worker-b" },
            {
              decisionPoint: "分岐2",
              cases: {
                サブケース: [{ skillName: "worker-c" }],
              },
            },
          ],
        },
      },
    ];

    const result = generateOrchestratorContent({

      steps,
    });

    expect(result).toContain("### Step 1: worker-a");
    expect(result).toContain("### Step 2: 分岐1");
    expect(result).toContain("##### Step 2A-1: worker-b");
    expect(result).toContain("##### Step 2A-2: 分岐2");
    expect(result).toContain("####### Step 2A-2A-1: worker-c");
  });

  it("スキル参照ステップに委譲文が出力される", () => {
    const result = generateOrchestratorContent({
      steps: [{ skillName: "worker-a" }],
    });

    expect(result).toContain("### Step 1: worker-a");
    expect(result).toContain("worker-a skill を実行する。");
  });

  it("InlineStep に複数の steps がある場合、構造化された手順が出力される", () => {
    const steps: LoadedStep[] = [
      {
        inline: "ブランチ作成",
        steps: [
          {
            id: "1",
            title: "ベースブランチ判定",
            body: "git branch -a で develop の存在を確認する",
          },
          {
            id: "2",
            title: "ブランチ切り替え",
            body: "feature/{タスクID} ブランチを作成して切り替える",
          },
        ],
      },
    ];

    const result = generateOrchestratorContent({

      steps,
    });

    expect(result).toContain("### Step 1: ブランチ作成");
    expect(result).not.toContain("#### 手順");
    expect(result).toContain("1. ベースブランチ判定");
    expect(result).toContain("git branch -a で develop の存在を確認する");
    expect(result).toContain("2. ブランチ切り替え");
    expect(result).toContain("feature/{タスクID} ブランチを作成して切り替える");
  });

  it("InlineStep に steps が空配列の場合、手順セクションが出力されない", () => {
    const steps: LoadedStep[] = [
      {
        inline: "シンプル処理",
        steps: [],
        input: ["入力データ"],
        output: ["出力結果"],
      },
    ];

    const result = generateOrchestratorContent({

      steps,
    });

    expect(result).toContain("### Step 1: シンプル処理");
    expect(result).toContain("入力:");
    expect(result).toContain("入力データ");
    expect(result).toContain("出力:");
    expect(result).toContain("出力結果");
    expect(result).not.toContain("#### 手順");
  });

  it("afterSectionsが「補足説明」見出しの下にサブ見出しとして出力される", () => {
    const result = generateOrchestratorContent({
      steps: [{ skillName: "worker-a" }],
      afterSections: [
        { heading: "エスカレーションポリシー", body: "ポリシー内容" },
      ],
    });

    expect(result).toContain("## 補足説明");
    expect(result).toContain("### エスカレーションポリシー");
    expect(result).toContain("ポリシー内容");
  });

  it("beforeSections / afterSections が混在する場合", () => {
    const result = generateOrchestratorContent({
      steps: [{ skillName: "worker-a" }, { skillName: "worker-b" }],
      beforeSections: [
        { heading: "事前確認", body: "確認事項" },
      ],
      afterSections: [
        { heading: "注意事項", body: "注意内容" },
      ],
    });

    const beforeIdx = result.indexOf("## 事前確認");
    const stepsIdx = result.indexOf("## 作業詳細");
    const step1Idx = result.indexOf("### Step 1: worker-a");
    const step2Idx = result.indexOf("### Step 2: worker-b");
    const afterIdx = result.indexOf("### 注意事項");

    expect(beforeIdx).toBeLessThan(stepsIdx);
    expect(step1Idx).toBeLessThan(step2Idx);
    expect(step2Idx).toBeLessThan(afterIdx);
  });
});
