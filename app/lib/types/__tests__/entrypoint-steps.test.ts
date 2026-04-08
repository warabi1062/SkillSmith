import { describe, it, expect } from "vitest";
import { EntryPointSkill, WorkerSkill } from "../skill";

// テスト用ヘルパー
function worker(name: string): WorkerSkill {
  return new WorkerSkill({ name, workerSteps: [{ id: "1", title: name, body: "" }] });
}

describe("EntryPointSkill の steps → dependencies 自動導出", () => {
  it("steps から dependencies を自動導出する", () => {
    const s1 = worker("s1");
    const s2 = worker("s2");
    const s3 = worker("s3");

    const skill = new EntryPointSkill({
      name: "test",
      steps: [
        {
          decisionPoint: "判定",
          cases: {
            A: [s1],
            B: [],
          },
        },
        s2,
        s3,
      ],
    });

    expect(skill.dependencies?.map((d) => d.name)).toEqual(["s1", "s2", "s3"]);
    expect(skill.steps).toHaveLength(3);
  });

  it("dependencies を明示的に指定した場合は自動導出しない", () => {
    const s1 = worker("s1");
    const s2 = worker("s2");

    const skill = new EntryPointSkill({
      name: "test",
      steps: [s1, s2],
      dependencies: [s1], // 明示的に s1 のみ
    });

    expect(skill.dependencies?.map((d) => d.name)).toEqual(["s1"]);
  });

});
