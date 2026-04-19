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
    skillName: "review-team",
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

  it("各teammate は subagent_type 参照の 1 行に簡略化される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### implementer");
    expect(result).toContain(
      "subagent_type: `review-team-implementer` でスポーンすること。役割と手順は `agents/review-team-implementer.md` を参照。",
    );

    expect(result).toContain("### reviewer");
    expect(result).toContain(
      "subagent_type: `review-team-reviewer` でスポーンすること。役割と手順は `agents/review-team-reviewer.md` を参照。",
    );

    // 旧フォーマットの teammate 本体は残っていない
    expect(result).not.toContain("implementerの役割説明");
    expect(result).not.toContain("##### W1. 作業開始");
    expect(result).not.toContain("##### R1. ポーリング");
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

  it("制約・メッセージ送受信ルールはリーダーセクションのみに残る", () => {
    const result = generateTeamContent(makeInput());

    // 制約見出しはリーダーのみで 1 回出現する（各 teammate は agent.md 側に移動）
    const constraintHeadingCount = result.split("#### 制約").length - 1;
    expect(constraintHeadingCount).toBe(1);

    // 共通ルールセクション（トップレベル）は維持される
    expect(result).toContain("### 共通ルール");

    // メッセージ送受信ルールは共通ルール + リーダーで計 2 回出現する
    const messagingSnippet = "メンバー間のメッセージ送受信は確認応答方式で行う";
    const messagingCount = result.split(messagingSnippet).length - 1;
    expect(messagingCount).toBe(2);

    // 残り 2 ルールは共通ルールのみで 1 回のみ出現する
    const nameRuleCount =
      result.split("完全一致する name でスポーンすること").length - 1;
    expect(nameRuleCount).toBe(1);

    const reviewCycleCount =
      result.split("レビューサイクルは最大3回で打ち切り").length - 1;
    expect(reviewCycleCount).toBe(1);
  });

  it("subagent_type 参照が全 teammate 分 prefix 付きで出力される", () => {
    const result = generateTeamContent(makeInput());

    const subagentRefs = result.match(/subagent_type: `[^`]+`/g) ?? [];
    expect(subagentRefs).toEqual([
      "subagent_type: `review-team-implementer`",
      "subagent_type: `review-team-reviewer`",
    ]);
  });
});
