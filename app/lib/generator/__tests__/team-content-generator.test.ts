import { describe, it, expect } from "vitest";
import { generateTeamContent } from "../team-content-generator";
import type { TeamContentInput } from "../team-content-generator";
import type { LoadedTeammate } from "../../types/loader.server";

// テスト用ヘルパー: 最小のteammate定義
function makeWorker(name: string): LoadedTeammate {
  return {
    name,
    role: `${name}の役割説明`,
    steps: [{ id: "W1", title: "作業開始", body: "作業を開始する。" }],
    sortOrder: 1,
    communicationPattern: { type: "responder" },
  };
}

function makeReviewer(pollingTarget: string): LoadedTeammate {
  return {
    name: "reviewer",
    role: "レビューを行う。",
    steps: [
      { id: "R1", title: "ポーリング", body: "status_checkを送信する。" },
      { id: "R2", title: "レビュー実行", body: "レビューを行う。" },
    ],
    sortOrder: 2,
    communicationPattern: { type: "poller", target: pollingTarget },
  };
}

function makeInput(overrides?: Partial<TeamContentInput>): TeamContentInput {
  return {
    input: "- タスクID",
    output: "- 結果のパス",
    teammates: [makeWorker("implementer"), makeReviewer("implementer")],
    teamPrefix: "test",
    ...overrides,
  };
}

describe("generateTeamContent", () => {
  it("入力セクションが生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("## 入力");
    expect(result).toContain("- タスクID");
  });

  it("入力がない場合は入力セクションが省略される", () => {
    const result = generateTeamContent(makeInput({ input: undefined }));

    expect(result).not.toContain("## 入力");
  });

  it("出力セクションが生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("## 出力");
    expect(result).toContain("- 結果のパス");
  });

  it("出力がない場合は出力セクションが省略される", () => {
    const result = generateTeamContent(makeInput({ output: undefined }));

    expect(result).not.toContain("## 出力");
  });

  it("リーダーセクションにメンバー名が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### リーダー");
    expect(result).toContain("implementer / reviewer の進捗監視");
  });

  it("requiresUserApproval が true の場合、ユーザー承認フローが含まれる", () => {
    const result = generateTeamContent(
      makeInput({ requiresUserApproval: true }),
    );

    expect(result).toContain(
      "レビューPASS後、成果物をユーザーに提示して承認を得る",
    );
    expect(result).toContain("implementer に修正を依頼する");
  });

  it("requiresUserApproval が false/undefined の場合、ユーザー承認フローが含まれない", () => {
    const result = generateTeamContent(
      makeInput({ requiresUserApproval: false }),
    );

    expect(result).not.toContain("ユーザーに提示して承認を得る");
  });

  it("各teammateのセクションが生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### implementer");
    expect(result).toContain("#### 役割");
    expect(result).toContain("implementerの役割説明");
    expect(result).toContain("##### W1. 作業開始");
    expect(result).toContain("作業を開始する。");

    expect(result).toContain("### reviewer");
    expect(result).toContain("##### R1. ポーリング");
    expect(result).toContain("##### R2. レビュー実行");
  });

  it("teammateがsortOrder順にソートされる", () => {
    const teammates: LoadedTeammate[] = [
      { ...makeReviewer("worker"), sortOrder: 2 },
      { ...makeWorker("worker"), sortOrder: 1 },
    ];
    const result = generateTeamContent(makeInput({ teammates }));

    const workerIdx = result.indexOf("### worker");
    const reviewerIdx = result.indexOf("### reviewer");
    expect(workerIdx).toBeLessThan(reviewerIdx);
  });

  it("概要にメンバー構成とリーダー参加が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("implementer・reviewerの2名体制");
    expect(result).toContain("メインエージェントはリーダーとして参加する");
  });
});
