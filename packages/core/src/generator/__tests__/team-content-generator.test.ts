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

  it("スポーンルールセクションが出力される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### Teammate スポーンに関するルール");
    // 旧仕様の「subagent_type は指定しない」という説明は不要なので含めない
    expect(result).not.toContain("subagent_type は指定しない");
  });

  it("スポーンルールに name パラメータの指示と用途が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain(
      "name パラメータには `implementer` / `reviewer`（teammate 名そのもの）を指定する",
    );
    expect(result).toContain("SendMessage の to");
    expect(result).toContain("TaskUpdate の owner");
  });

  it("スポーンルールに prompt へ役割・制約・手順を全文含める指示が記述される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain(
      "prompt には、Teammate セクションに記載された当該メンバーの役割・制約・手順を全文含める",
    );
    expect(result).toContain("独立コンテキスト");
    expect(result).toContain("親の会話履歴を参照できない");
  });

  it("旧仕様の subagent_type 個別指定や agent 定義ファイル参照は出力されない", () => {
    const result = generateTeamContent(makeInput());

    expect(result).not.toContain("`review-team-implementer`");
    expect(result).not.toContain("`review-team-reviewer`");
    expect(result).not.toContain("agent 定義ファイル");
    expect(result).not.toContain("agents/");
  });

  it("model 指定がない場合は spawn ルールに model 行が出ない", () => {
    const result = generateTeamContent(makeInput());

    // どの teammate にも model 指定がないため、Agent ツールの model パラメータ行は出ない
    expect(result).not.toContain("Agent ツールの model パラメータで以下");
  });

  it("model 指定がある teammate のみ spawn ルールに列挙される", () => {
    const teammates: LoadedTeammate[] = [
      { ...makeWorker("implementer"), model: "haiku" },
      makeReviewer(),
    ];
    const result = generateTeamContent(makeInput({ teammates }));

    expect(result).toContain(
      "Agent ツールの model パラメータで以下のモデルを指定する",
    );
    expect(result).toContain('`implementer` は `model: "haiku"`');
    // model 指定のない reviewer は列挙対象外
    expect(result).not.toContain("`reviewer` は `model:");
  });

  it("レビューサイクル打ち切りルールはリーダーの担当に含まれる", () => {
    const result = generateTeamContent(makeInput());

    const leaderIdx = result.indexOf("### リーダー");
    // 行頭の "### "（teammate 見出し）を次に検索する。indexOf("### ", ...) だと
    // "#### " 内部の "### " 部分文字列にもマッチしてしまうため、改行つきパターンで探す
    const nextMemberIdx = result.indexOf("\n### ", leaderIdx + 1);
    const leaderSection = result.slice(
      leaderIdx,
      nextMemberIdx === -1 ? undefined : nextMemberIdx,
    );
    expect(leaderSection).toContain(
      "レビューサイクルは最大3回で打ち切り、解決しない場合はユーザーに報告して判断を仰ぐ",
    );
  });

  it("メッセージ送受信ルールはリーダー制約と各 teammate 制約に転記される", () => {
    const result = generateTeamContent(makeInput());

    // リーダー（1）+ 各 teammate（2）= 計3回
    const messagingSnippet = "メンバー間のメッセージ送受信は確認応答方式で行う";
    const messagingCount = result.split(messagingSnippet).length - 1;
    expect(messagingCount).toBe(3);
  });

  it("概要に「役割・制約・手順を prompt として渡して起動する」文言が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain(
      "各メンバーの役割・制約・手順を prompt として渡して起動する",
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

  it("各teammate は役割・制約・手順を全文含めた本体で出力される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### implementer");
    expect(result).toContain("implementerの役割説明");
    expect(result).toContain("##### W1. 作業開始");
    expect(result).toContain("作業を開始する。");

    expect(result).toContain("### reviewer");
    expect(result).toContain("##### R1. ポーリング");
    expect(result).toContain("##### R2. レビュー実行");
  });

  it("model 指定がある teammate のセクションには #### モデル ブロックが含まれる", () => {
    const teammates: LoadedTeammate[] = [
      { ...makeWorker("implementer"), model: "haiku" },
      makeReviewer(),
    ];
    const result = generateTeamContent(makeInput({ teammates }));

    const implementerIdx = result.indexOf("\n### implementer");
    const reviewerIdx = result.indexOf("\n### reviewer");
    const implementerSection = result.slice(implementerIdx, reviewerIdx);
    const reviewerSection = result.slice(reviewerIdx);

    expect(implementerSection).toContain("#### モデル");
    expect(implementerSection).toContain(
      "Agent ツールの model パラメータに `haiku` を指定して起動する。",
    );
    expect(reviewerSection).not.toContain("#### モデル");
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
});
