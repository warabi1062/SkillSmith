import { describe, it, expect } from "vitest";
import { generateTeamContent } from "../team-content-generator";
import type { TeamContentInput } from "../team-content-generator";
import type { LoadedTeammate } from "../../types/loaded";

// テスト用ヘルパー: 最小のteammate定義
function makeWorker(name: string): LoadedTeammate {
  return {
    name,
    role: `${name}の役割説明`,
    steps: [{ id: "W1", title: "作業開始", body: "作業を開始する。" }],
    sortOrder: 1,
  };
}

function makeReviewer(): LoadedTeammate {
  return {
    name: "reviewer",
    role: "レビューを行う。",
    steps: [
      { id: "R1", title: "ポーリング", body: "status_checkを送信する。" },
      { id: "R2", title: "レビュー実行", body: "レビューを行う。" },
    ],
    sortOrder: 2,
  };
}

function makeInput(overrides?: Partial<TeamContentInput>): TeamContentInput {
  return {
    input: ["タスクID"],
    output: ["結果のファイルパス"],
    teammates: [makeWorker("implementer"), makeReviewer()],
    teamPrefix: "test",
    ...overrides,
  };
}

describe("generateTeamContent", () => {
  it("入力セクションが生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("## 入力");
    expect(result).toContain("タスクID");
  });

  it("入力がない場合は入力セクションが省略される", () => {
    const result = generateTeamContent(makeInput({ input: undefined }));

    expect(result).not.toContain("## 入力");
  });

  it("出力セクションが生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("## 出力");
    expect(result).toContain("結果のファイルパス");
  });

  it("出力がない場合は出力セクションが省略される", () => {
    const result = generateTeamContent(makeInput({ output: undefined }));

    expect(result).not.toContain("## 出力");
  });

  it("リーダーセクションにメンバー名が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### リーダー");
    expect(result).toContain("implementer / reviewer の進捗監視");
    expect(result).toContain(
      "全メンバーが停止している場合は状況を調査して適切に teammate に指示を出す",
    );
  });

  it("チーム共通ルールにメンバー名の厳守指示が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain(
      "定義された名前（implementer, reviewer）と完全一致する name でスポーンすること",
    );
  });

  it("requiresUserApproval が true の場合、ユーザー承認フローが含まれる", () => {
    const result = generateTeamContent(
      makeInput({ requiresUserApproval: true }),
    );

    expect(result).toContain(
      "レビューPASS後、成果物をユーザーに提示して承認を得る",
    );
    expect(result).toContain("適切なメンバーに修正を依頼する");
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
      { ...makeReviewer(), sortOrder: 2 },
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

  it("メッセージ送受信ルールのみ各メンバーの制約として転記される", () => {
    const result = generateTeamContent(makeInput());

    // 制約見出しがリーダー + 各teammate分の計3回出現する
    const constraintHeadingCount = result.split("#### 制約").length - 1;
    expect(constraintHeadingCount).toBe(3);

    // 共通ルールセクション（トップレベル）は維持される
    expect(result).toContain("### 共通ルール");

    // メッセージ送受信ルールは共通ルール + 3メンバーで計4回出現する
    const messagingSnippet = "メンバー間のメッセージ送受信は確認応答方式で行う";
    const messagingCount = result.split(messagingSnippet).length - 1;
    expect(messagingCount).toBe(4);

    // 残り2ルールは共通ルールのみで1回のみ出現する
    const nameRuleCount =
      result.split("完全一致する name でスポーンすること").length - 1;
    expect(nameRuleCount).toBe(1);

    const reviewCycleCount =
      result.split("レビューサイクルは最大3回で打ち切り").length - 1;
    expect(reviewCycleCount).toBe(1);
  });
});
