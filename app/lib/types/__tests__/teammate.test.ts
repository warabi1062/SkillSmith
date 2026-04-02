import { describe, it, expect } from "vitest";
import { toAgentTeamMember, WorkerWithAgentTeam, tool } from "../skill";
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

describe("toAgentTeamMember", () => {
  it("Teammate から AgentTeamMember に変換する", () => {
    const teammate = makeTeammate("implementer", 1);
    const result = toAgentTeamMember(teammate);

    expect(result).toEqual({
      skillName: "implementer",
      sortOrder: 1,
    });
  });

  it("sortOrder が undefined の場合もそのまま変換する", () => {
    const teammate = makeTeammate("reviewer");
    const result = toAgentTeamMember(teammate);

    expect(result).toEqual({
      skillName: "reviewer",
      sortOrder: undefined,
    });
  });
});

describe("WorkerWithAgentTeam", () => {
  it("teammates ベースで作成した場合、agentTeamMembers が自動導出される", () => {
    const skill = new WorkerWithAgentTeam({
      name: "test-team",
      teammates: [makeTeammate("worker", 1), makeTeammate("reviewer", 2)],
      teamPrefix: "test",
    });

    expect(skill.agentTeamMembers).toEqual([
      { skillName: "worker", sortOrder: 1 },
      { skillName: "reviewer", sortOrder: 2 },
    ]);
    expect(skill.teammates).toHaveLength(2);
    expect(skill.teamPrefix).toBe("test");
    expect(skill.content).toBe("");
  });

  it("agentTeamMembers ベースで作成した場合、後方互換が維持される", () => {
    const skill = new WorkerWithAgentTeam({
      name: "legacy-team",
      content: "# Legacy",
      agentTeamMembers: [{ skillName: "worker", sortOrder: 1 }],
    });

    expect(skill.agentTeamMembers).toEqual([
      { skillName: "worker", sortOrder: 1 },
    ]);
    expect(skill.teammates).toBeUndefined();
    expect(skill.content).toBe("# Legacy");
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
});
