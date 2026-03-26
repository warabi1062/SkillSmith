import { describe, it, expect } from "vitest";
import {
  isBranch,
  isInlineStep,
  collectSkillsFromSteps,
  WorkerSkill,
} from "../skill";
import type { Branch, InlineStep, Step } from "../skill";

// テスト用ヘルパー: 最小の WorkerSkill を作成
function worker(name: string): WorkerSkill {
  return new WorkerSkill({ name, content: `# ${name}` });
}

describe("isBranch", () => {
  it("Branch オブジェクトに対して true を返す", () => {
    const branch: Branch = {
      decisionPoint: "入力判定",
      cases: { "A": [], "B": [] },
    };
    expect(isBranch(branch)).toBe(true);
  });

  it("Skill インスタンスに対して false を返す", () => {
    const skill = worker("test");
    expect(isBranch(skill)).toBe(false);
  });

  it("InlineStep に対して false を返す", () => {
    const inline: InlineStep = { inline: "ブランチ作成", steps: [] };
    expect(isBranch(inline)).toBe(false);
  });
});

describe("isInlineStep", () => {
  it("InlineStep オブジェクトに対して true を返す", () => {
    const inline: InlineStep = { inline: "ブランチ作成", steps: [] };
    expect(isInlineStep(inline)).toBe(true);
  });

  it("Skill インスタンスに対して false を返す", () => {
    expect(isInlineStep(worker("test"))).toBe(false);
  });

  it("Branch オブジェクトに対して false を返す", () => {
    const branch: Branch = { decisionPoint: "判定", cases: {} };
    expect(isInlineStep(branch)).toBe(false);
  });
});

describe("collectSkillsFromSteps", () => {
  it("フラットな Skill 配列を収集する", () => {
    const s1 = worker("s1");
    const s2 = worker("s2");
    const result = collectSkillsFromSteps([s1, s2]);
    expect(result.map((s) => s.name)).toEqual(["s1", "s2"]);
  });

  it("Branch 内の Skill を再帰的に収集する", () => {
    const s1 = worker("s1");
    const s2 = worker("s2");
    const s3 = worker("s3");
    const steps: Step[] = [
      {
        decisionPoint: "分岐",
        cases: {
          "A": [s1, s2],
          "B": [s3],
        },
      },
    ];
    const result = collectSkillsFromSteps(steps);
    expect(result.map((s) => s.name)).toEqual(["s1", "s2", "s3"]);
  });

  it("重複するスキルを除去する（初出優先）", () => {
    const shared = worker("shared");
    const s1 = worker("s1");
    const steps: Step[] = [
      {
        decisionPoint: "分岐",
        cases: {
          "A": [s1, shared],
          "B": [shared],
        },
      },
    ];
    const result = collectSkillsFromSteps(steps);
    expect(result.map((s) => s.name)).toEqual(["s1", "shared"]);
  });

  it("Branch と Skill が混在するステップ列を処理する", () => {
    const s1 = worker("s1");
    const s2 = worker("s2");
    const s3 = worker("s3");
    const s4 = worker("s4");
    const steps: Step[] = [
      {
        decisionPoint: "入力判定",
        cases: {
          "Linearモード": [s1, s2],
          "Quickモード": [],
        },
      },
      s3,
      s4,
    ];
    const result = collectSkillsFromSteps(steps);
    expect(result.map((s) => s.name)).toEqual(["s1", "s2", "s3", "s4"]);
  });

  it("ネストされた Branch を処理する", () => {
    const s1 = worker("s1");
    const s2 = worker("s2");
    const s3 = worker("s3");
    const steps: Step[] = [
      {
        decisionPoint: "外側",
        cases: {
          "A": [
            s1,
            {
              decisionPoint: "内側",
              cases: {
                "X": [s2],
                "Y": [s3],
              },
            },
          ],
          "B": [],
        },
      },
    ];
    const result = collectSkillsFromSteps(steps);
    expect(result.map((s) => s.name)).toEqual(["s1", "s2", "s3"]);
  });

  it("InlineStep をスキップして Skill のみ収集する", () => {
    const s1 = worker("s1");
    const steps: Step[] = [
      { inline: "ブランチ作成", steps: [] },
      s1,
      { inline: "タスクID生成", steps: [] },
    ];
    const result = collectSkillsFromSteps(steps);
    expect(result.map((s) => s.name)).toEqual(["s1"]);
  });

  it("Branch 内の InlineStep もスキップする", () => {
    const s1 = worker("s1");
    const steps: Step[] = [
      {
        decisionPoint: "分岐",
        cases: {
          "A": [{ inline: "準備", steps: [] }, s1],
          "B": [{ inline: "クリーンアップ", steps: [] }],
        },
      },
    ];
    const result = collectSkillsFromSteps(steps);
    expect(result.map((s) => s.name)).toEqual(["s1"]);
  });

  it("空の steps で空配列を返す", () => {
    expect(collectSkillsFromSteps([])).toEqual([]);
  });
});
