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

  it("スポーンルールに subagent_type の指示が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### Teammate スポーンに関するルール");
    expect(result).toContain(
      "subagent_type に `review-team-implementer` / `review-team-reviewer` を指定する",
    );
    expect(result).toContain("agent 定義ファイルと一致");
  });

  it("スポーンルールに name パラメータの指示と用途が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain(
      "name パラメータには `implementer` / `reviewer`（teammate 名そのもの）を指定する",
    );
    expect(result).toContain("SendMessage の to");
    expect(result).toContain("TaskUpdate の owner");
  });

  it("旧仕様の「定義された名前と完全一致する name でスポーンすること」文言が含まれない", () => {
    const result = generateTeamContent(makeInput());

    expect(result).not.toContain("定義された名前（");
    expect(result).not.toContain("完全一致する name でスポーンすること");
  });

  it("スポーンルールに prompt で役割・手順を再記述しない指示が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("絶対に prompt へ再掲しない");
    expect(result).toContain("agent 定義ファイル側に記述済み");
    expect(result).toContain("二重指示は挙動不安定化の原因");
  });

  it("スポーンルールに prompt に渡すべき情報の指針（独立コンテキスト向け具体情報）が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("のみを自然言語で渡す");
    expect(result).toContain("独立コンテキスト");
    expect(result).toContain("親の会話履歴を参照できない");
    expect(result).toContain("前工程の成果物のファイルパス");
  });

  it("スポーンルールセクションのみが存在し、共通ルールセクションは出力されない", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### Teammate スポーンに関するルール");
    // 共通ルールはリーダー duties と各 agent 制約に吸収されたため、独立セクションとしては存在しない
    expect(result).not.toContain("### 共通ルール");
  });

  it("レビューサイクル打ち切りルールはリーダーの担当に含まれる", () => {
    const result = generateTeamContent(makeInput());

    // リーダーセクション配下に 1 回だけ出現する
    const leaderIdx = result.indexOf("### リーダー");
    const leaderSection = result.slice(leaderIdx);
    expect(leaderSection).toContain(
      "レビューサイクルは最大3回で打ち切り、解決しない場合はユーザーに報告して判断を仰ぐ",
    );

    const reviewCycleCount =
      result.split("レビューサイクルは最大3回で打ち切り").length - 1;
    expect(reviewCycleCount).toBe(1);
  });

  it("メッセージ送受信ルールは共通ルールから除去され、リーダー制約と各 agent（buildMemberConstraints 経由）にのみ残る", () => {
    const result = generateTeamContent(makeInput());

    // generateTeamContent の出力にはリーダー制約でのみ 1 回出現する（各 teammate の agent.md 側には出ない）
    const messagingSnippet = "メンバー間のメッセージ送受信は確認応答方式で行う";
    const messagingCount = result.split(messagingSnippet).length - 1;
    expect(messagingCount).toBe(1);
  });

  it("概要に旧仕様の「各メンバーの役割・手順をプロンプトとして渡して起動する」文言が含まれない", () => {
    const result = generateTeamContent(makeInput());

    expect(result).not.toContain("役割・手順をプロンプトとして渡して起動する");
    expect(result).not.toContain(
      "共通ルールと各メンバーの役割・手順をプロンプトとして渡して",
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

  it("各teammate は役割 + subagent_type の軽量な索引行に簡略化される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### implementer");
    expect(result).toContain(
      "implementerの役割説明 `subagent_type: review-team-implementer` でスポーンする。",
    );

    expect(result).toContain("### reviewer");
    expect(result).toContain(
      "レビューを行う。 `subagent_type: review-team-reviewer` でスポーンする。",
    );

    // agents/*.md への参照は含まれない
    expect(result).not.toContain("agents/review-team-implementer.md");
    expect(result).not.toContain("agents/review-team-reviewer.md");
    expect(result).not.toMatch(/`agents\/[^`]+\.md` を参照/);

    // 旧フォーマットの teammate 本体は残っていない
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

  it("制約見出しはリーダーセクションのみ、各指示は 1 回のみ出現する", () => {
    const result = generateTeamContent(makeInput());

    // 制約見出しはリーダーのみで 1 回出現する（各 teammate は agent.md 側に移動）
    const constraintHeadingCount = result.split("#### 制約").length - 1;
    expect(constraintHeadingCount).toBe(1);

    // subagent_type 指示はスポーンルールのみで 1 回出現する
    const subagentTypeRuleCount =
      result.split("subagent_type に `review-team-implementer`").length - 1;
    expect(subagentTypeRuleCount).toBe(1);

    // name 指示はスポーンルールのみで 1 回出現する
    const nameRuleCount =
      result.split("name パラメータには `implementer` / `reviewer`").length - 1;
    expect(nameRuleCount).toBe(1);
  });

  it("subagent_type 参照が全 teammate 分 prefix 付きで出力される", () => {
    const result = generateTeamContent(makeInput());

    // 共通ルール内（バッククォートで囲まれた prefix 付き名）+ 各 teammate セクション（`subagent_type: xxx` 形式）の両方で出現
    expect(result).toContain("`review-team-implementer`");
    expect(result).toContain("`review-team-reviewer`");
    expect(result).toContain("`subagent_type: review-team-implementer`");
    expect(result).toContain("`subagent_type: review-team-reviewer`");
  });
});
