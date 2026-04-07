import { describe, it, expect } from "vitest";
import { resolveSkillContent } from "../content-resolver.server";
import type { LoadedSkillUnion } from "../../types/loaded";
import { SKILL_TYPES } from "../../types/constants";

function makeEntryPointSkill(overrides?: Partial<LoadedSkillUnion>): LoadedSkillUnion {
  return {
    name: "my-orchestrator",
    skillType: SKILL_TYPES.ENTRY_POINT,
    content: "手動content",
    files: [],
    steps: [
      { inline: "タスク実行", steps: [{ id: "1", title: "実行", body: "実行する" }] },
    ],
    ...overrides,
  } as LoadedSkillUnion;
}

function makeWorkerSkill(overrides?: Record<string, unknown>): LoadedSkillUnion {
  return {
    name: "my-worker",
    skillType: SKILL_TYPES.WORKER,
    files: [],
    input: ["タスクID"],
    output: ["結果ファイル"],
    workerSteps: [{ id: "1", title: "実行", body: "実行する" }],
    ...overrides,
  } as LoadedSkillUnion;
}

function makeWorkerWithSubAgent(overrides?: Record<string, unknown>): LoadedSkillUnion {
  return {
    name: "my-sub-agent",
    skillType: SKILL_TYPES.WORKER_WITH_SUB_AGENT,
    content: "手動content",
    files: [],
    input: ["タスクID"],
    output: ["結果ファイル"],
    workerSteps: [{ id: "1", title: "実行", body: "実行する" }],
    agentConfig: { content: "agent body" },
    ...overrides,
  } as LoadedSkillUnion;
}

function makeWorkerWithAgentTeam(overrides?: Record<string, unknown>): LoadedSkillUnion {
  return {
    name: "my-team",
    skillType: SKILL_TYPES.WORKER_WITH_AGENT_TEAM,
    content: "手動content",
    files: [],
    teammates: [
      { name: "worker", role: "実装担当", steps: [{ id: "1", title: "実装", body: "実装する" }] },
    ],
    teamPrefix: "test",
    ...overrides,
  } as LoadedSkillUnion;
}

describe("resolveSkillContent", () => {
  it("EntryPoint で steps がある場合はオーケストレーターcontentを自動生成する", () => {
    const result = resolveSkillContent(makeEntryPointSkill());

    expect(result).toContain("## 作業詳細");
    expect(result).not.toBe("手動content");
  });

  it("EntryPoint で steps がない場合はスキル定義の content をそのまま返す", () => {
    const result = resolveSkillContent(
      makeEntryPointSkill({ steps: undefined } as unknown as Partial<LoadedSkillUnion>),
    );

    expect(result).toBe("手動content");
  });

  it("WorkerSkill で workerSteps からworker contentを自動生成する", () => {
    const result = resolveSkillContent(makeWorkerSkill());

    expect(result).toContain("## 手順");
    expect(result).toContain("## 入力");
  });

  it("WorkerWithSubAgent で workerSteps からworker contentを自動生成する", () => {
    const result = resolveSkillContent(makeWorkerWithSubAgent());

    expect(result).toContain("## 手順");
    expect(result).toContain("## 入力");
    expect(result).not.toBe("手動content");
  });

  it("WorkerWithAgentTeam で teammates と teamPrefix がある場合はteam contentを自動生成する", () => {
    const result = resolveSkillContent(makeWorkerWithAgentTeam());

    expect(result).toContain("## Teammate");
    expect(result).not.toBe("手動content");
  });

  it("WorkerWithAgentTeam で teamPrefix がない場合はスキル定義の content をそのまま返す", () => {
    const result = resolveSkillContent(
      makeWorkerWithAgentTeam({ teamPrefix: undefined }),
    );

    expect(result).toBe("手動content");
  });
});
