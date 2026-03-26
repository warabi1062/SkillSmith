import { describe, it, expect } from "vitest";
import { generateAgentContent } from "../agent-content-generator";
import type { AgentContentInput } from "../agent-content-generator";

function makeInput(overrides?: Partial<AgentContentInput>): AgentContentInput {
  return {
    skillName: "test-skill",
    description: "テスト用エージェント。",
    input: "- チケットID",
    output: "- 結果のパス",
    ...overrides,
  };
}

describe("generateAgentContent", () => {
  it("descriptionが含まれる", () => {
    const result = generateAgentContent(makeInput());

    expect(result).toContain("テスト用エージェント。");
  });

  it("入力セクションが生成される", () => {
    const result = generateAgentContent(makeInput());

    expect(result).toContain("## 入力");
    expect(result).toContain("- チケットID");
  });

  it("出力セクションが生成される", () => {
    const result = generateAgentContent(makeInput());

    expect(result).toContain("## 出力");
    expect(result).toContain("- 結果のパス");
  });

  it("実行セクションにスキル名への委譲が含まれる", () => {
    const result = generateAgentContent(makeInput());

    expect(result).toContain("## 実行");
    expect(result).toContain("test-skill skill の手順に従って実行する。");
  });

  it("入力がない場合は入力セクションが省略される", () => {
    const result = generateAgentContent(makeInput({ input: undefined }));

    expect(result).not.toContain("## 入力");
  });

  it("出力がない場合は出力セクションが省略される", () => {
    const result = generateAgentContent(makeInput({ output: undefined }));

    expect(result).not.toContain("## 出力");
  });

  it("descriptionがない場合は先頭が空にならない", () => {
    const result = generateAgentContent(makeInput({ description: undefined }));

    expect(result).not.toMatch(/^\n/);
  });

  it("before-stepsセクションが実行セクションの後に配置される", () => {
    const result = generateAgentContent(makeInput({
      sections: [
        { heading: "前提条件", body: "必要な前提条件。", position: "before-steps" },
      ],
    }));

    const execIdx = result.indexOf("## 実行");
    const beforeIdx = result.indexOf("## 前提条件");
    expect(execIdx).toBeGreaterThan(-1);
    expect(beforeIdx).toBeGreaterThan(-1);
    expect(beforeIdx).toBeGreaterThan(execIdx);
  });

  it("after-stepsセクションがbefore-stepsの後に配置される", () => {
    const result = generateAgentContent(makeInput({
      sections: [
        { heading: "前提条件", body: "前提条件。", position: "before-steps" },
        { heading: "セキュリティ", body: "セキュリティ要件。", position: "after-steps" },
      ],
    }));

    const beforeIdx = result.indexOf("## 前提条件");
    const afterIdx = result.indexOf("## セキュリティ");
    expect(beforeIdx).toBeGreaterThan(-1);
    expect(afterIdx).toBeGreaterThan(-1);
    expect(afterIdx).toBeGreaterThan(beforeIdx);
  });

  it("sectionsがない場合はdescription+実行のみ生成される", () => {
    const result = generateAgentContent(makeInput({
      input: undefined,
      output: undefined,
      sections: undefined,
    }));

    expect(result).toContain("テスト用エージェント。");
    expect(result).toContain("## 実行");
    // 余計なセクションがないことを確認
    const headings = result.match(/^## /gm) ?? [];
    expect(headings.length).toBe(1);
  });
});
