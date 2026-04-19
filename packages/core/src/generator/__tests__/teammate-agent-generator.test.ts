import { describe, expect, it } from "vitest";
import { generateTeammateAgentMd } from "../teammate-agent-generator.server";
import { tool } from "../../types/skill";
import type { LoadedTeammate } from "../../types/loaded";
import { FILE_PATHS } from "../../types/constants";

function makeTeammate(overrides?: Partial<LoadedTeammate>): LoadedTeammate {
  return {
    name: "drafter",
    role: "メッセージの草稿を作成する",
    steps: [
      { id: "1", title: "要件確認", body: "挨拶の対象を確認する。" },
      { id: "2", title: "草稿作成", body: "草稿を作成する。" },
    ],
    sortOrder: 1,
    ...overrides,
  };
}

describe("generateTeammateAgentMd", () => {
  it("agents/{skillName}-{teammate.name}.md へ prefix 付きで出力する", () => {
    const { file } = generateTeammateAgentMd("review-team", makeTeammate());

    expect(file.path).toBe(`${FILE_PATHS.AGENTS_DIR}review-team-drafter.md`);
    expect(file.skillName).toBe("review-team");
  });

  it("frontmatter.name が {skillName}-{teammate.name} になる", () => {
    const { file } = generateTeammateAgentMd("review-team", makeTeammate());

    expect(file.content).toContain("name: review-team-drafter");
  });

  it("frontmatter に description として teammate.role を出力する", () => {
    const { file } = generateTeammateAgentMd(
      "review-team",
      makeTeammate({ role: "草稿作成担当" }),
    );

    expect(file.content).toContain("description: 草稿作成担当");
  });

  it("model 指定時に frontmatter に出力する", () => {
    const { file } = generateTeammateAgentMd(
      "review-team",
      makeTeammate({ model: "haiku" }),
    );

    expect(file.content).toContain("model: haiku");
  });

  it("tools 指定時に frontmatter に YAML リストで出力する", () => {
    const { file } = generateTeammateAgentMd(
      "review-team",
      makeTeammate({ tools: [tool("Read"), tool("Write")] }),
    );

    expect(file.content).toContain("tools:");
    expect(file.content).toContain("  - Read");
    expect(file.content).toContain("  - Write");
  });

  it("model / tools を省略した場合は frontmatter に出ない", () => {
    const { file } = generateTeammateAgentMd("review-team", makeTeammate());

    expect(file.content).not.toContain("model:");
    expect(file.content).not.toContain("tools:");
  });

  it("skills フィールドは出力しない", () => {
    const { file } = generateTeammateAgentMd("review-team", makeTeammate());

    expect(file.content).not.toContain("skills:");
  });

  it("body に ## 役割 / ## 制約 / ## 手順 が含まれる", () => {
    const { file } = generateTeammateAgentMd("review-team", makeTeammate());

    expect(file.content).toContain("## 役割");
    expect(file.content).toContain("## 制約");
    expect(file.content).toContain("## 手順");
  });

  it("role が本文の ## 役割 セクションに含まれる", () => {
    const { file } = generateTeammateAgentMd(
      "review-team",
      makeTeammate({ role: "メッセージ草稿作成" }),
    );

    expect(file.content).toContain("メッセージ草稿作成");
  });

  it("制約セクションにメッセージ送受信ルールが出力される", () => {
    const { file } = generateTeammateAgentMd("review-team", makeTeammate());

    expect(file.content).toContain(
      "メンバー間のメッセージ送受信は確認応答方式で行う",
    );
  });

  it("手順ステップが ### {id}. {title} と本文で正しくレンダリングされる", () => {
    const { file } = generateTeammateAgentMd("review-team", makeTeammate());

    expect(file.content).toContain("### 1. 要件確認");
    expect(file.content).toContain("挨拶の対象を確認する。");
    expect(file.content).toContain("### 2. 草稿作成");
    expect(file.content).toContain("草稿を作成する。");
  });

  it("errors は空配列を返す", () => {
    const { errors } = generateTeammateAgentMd("review-team", makeTeammate());

    expect(errors).toEqual([]);
  });
});
