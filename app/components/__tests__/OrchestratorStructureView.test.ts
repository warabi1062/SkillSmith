import { describe, it, expect } from "vitest";
import { convertStep, convertSections } from "../orchestrator";

import type {
  LoadedStep,
  LoadedOrchestratorSection,
} from "../../lib/types/loader.server";

describe("convertStep", () => {
  it("SkillRefステップをskill型に変換する", () => {
    const result = convertStep({ skillName: "my-skill" });
    expect(result).toEqual({
      type: "skill",
      label: "my-skill",
    });
  });

  it("インラインステップをinline型に変換する", () => {
    const step: LoadedStep = {
      inline: "ブランチ作成",
      steps: [
        { id: "1", title: "ベース確認", body: "mainブランチを確認" },
        { id: "2", title: "作成", body: "新規ブランチを作成" },
      ],
    };
    const result = convertStep(step);
    expect(result).toEqual({
      type: "inline",
      label: "ブランチ作成",
      inlineSteps: [
        { id: "1", title: "ベース確認", body: "mainブランチを確認" },
        { id: "2", title: "作成", body: "新規ブランチを作成" },
      ],
    });
  });

  it("分岐ステップをbranch型に変換する", () => {
    const step: LoadedStep = {
      decisionPoint: "入力判定",
      description: "入力内容に応じて分岐",
      cases: {
        ケースA: [{ skillName: "skill-a" }],
        ケースB: [{ skillName: "skill-b" }],
      },
    };
    const result = convertStep(step);
    expect(result).toEqual({
      type: "branch",
      label: "入力判定",
      description: "入力内容に応じて分岐",
      cases: [
        { name: "ケースA", steps: [{ type: "skill", label: "skill-a" }] },
        { name: "ケースB", steps: [{ type: "skill", label: "skill-b" }] },
      ],
    });
  });

  it("分岐ステップ内のネストされたインラインステップを再帰的に変換する", () => {
    const step: LoadedStep = {
      decisionPoint: "判定",
      cases: {
        ケース1: [
          {
            inline: "前処理",
            steps: [{ id: "1", title: "準備", body: "準備する" }],
          },
        ],
      },
    };
    const result = convertStep(step);
    expect(result.cases![0].steps[0]).toEqual({
      type: "inline",
      label: "前処理",
      inlineSteps: [{ id: "1", title: "準備", body: "準備する" }],
    });
  });

  it("descriptionがない分岐ステップではdescriptionがundefinedになる", () => {
    const step: LoadedStep = {
      decisionPoint: "判定",
      cases: { A: [{ skillName: "s1" }] },
    };
    const result = convertStep(step);
    expect(result.description).toBeUndefined();
  });
});

describe("convertSections", () => {
  it("セクション配列を正しく変換する", () => {
    const sections: LoadedOrchestratorSection[] = [
      { heading: "前提条件", body: "条件A", position: "before-steps" },
      { heading: "後処理", body: "処理B", position: "after-steps" },
      { heading: "Step 1の前", body: "注意事項", position: "before-step:0" },
    ];
    const result = convertSections(sections);
    expect(result).toEqual([
      { heading: "前提条件", body: "条件A", position: "before-steps" },
      { heading: "後処理", body: "処理B", position: "after-steps" },
      { heading: "Step 1の前", body: "注意事項", position: "before-step:0" },
    ]);
  });

  it("空配列を渡すと空配列が返る", () => {
    expect(convertSections([])).toEqual([]);
  });
});
