import { describe, it, expect } from "vitest";
import { WorkerWithAgentTeam, tool } from "../skill";
import type { Teammate } from "../skill";

// テスト用ヘルパー: 最小の Teammate を作成
function makeTeammate(name: string, sortOrder?: number): Teammate {
  return {
    name,
    role: `${name}の役割`,
    steps: [{ id: "S1", title: "ステップ1", body: "本文" }],
    sortOrder,
  };
}

describe("WorkerWithAgentTeam", () => {
  it("teammates ベースで作成できる", () => {
    const skill = new WorkerWithAgentTeam({
      name: "test-team",
      teammates: [makeTeammate("worker", 1), makeTeammate("reviewer", 2)],
      teamPrefix: "test",
    });

    expect(skill.teammates).toHaveLength(2);
    expect(skill.teammates[0].name).toBe("worker");
    expect(skill.teammates[1].name).toBe("reviewer");
    expect(skill.teamPrefix).toBe("test");
  });

  it("requiresUserApproval フラグが設定される", () => {
    const skill = new WorkerWithAgentTeam({
      name: "approval-team",
      teammates: [makeTeammate("worker", 1)],
      teamPrefix: "test",
      requiresUserApproval: true,
    });

    expect(skill.requiresUserApproval).toBe(true);
  });

  it("teammates ベースでもオプショナルフィールドが設定される", () => {
    const skill = new WorkerWithAgentTeam({
      name: "full-team",
      teammates: [makeTeammate("worker", 1)],
      teamPrefix: "test",
      description: "テスト",
      input: ["入力"],
      output: ["出力"],
      allowedTools: [tool("Read")],
    });

    expect(skill.description).toBe("テスト");
    expect(skill.input).toEqual(["入力"]);
    expect(skill.output).toEqual(["出力"]);
    expect(skill.allowedTools).toEqual([tool("Read")]);
  });

  it("teammate に model を指定できる", () => {
    const teammate: Teammate = {
      name: "drafter",
      role: "草稿作成",
      model: "haiku",
      steps: [{ id: "S1", title: "ステップ1", body: "本文" }],
      sortOrder: 1,
    };
    const skill = new WorkerWithAgentTeam({
      name: "team-with-model",
      teammates: [teammate],
      teamPrefix: "test",
    });

    expect(skill.teammates[0].model).toBe("haiku");
  });
});
