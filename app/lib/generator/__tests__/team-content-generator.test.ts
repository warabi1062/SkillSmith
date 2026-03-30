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
    name: "test-team",
    description: "テスト用チームスキル",
    input: "- タスクID",
    output: "- 結果のパス",
    teammates: [makeWorker("implementer"), makeReviewer("implementer")],
    teamPrefix: "test",
    ...overrides,
  };
}

describe("generateTeamContent", () => {
  it("ヘッダーにスキル名とdescriptionが含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("# Test Team");
    expect(result).toContain("テスト用チームスキル");
  });

  it("入力セクションが生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("## 入力");
    expect(result).toContain("- タスクID");
  });

  it("入力がない場合は入力セクションが省略される", () => {
    const result = generateTeamContent(makeInput({ input: undefined }));

    expect(result).not.toContain("## 入力");
  });

  it("チーム作成セクションにteamPrefixが使われる", () => {
    const result = generateTeamContent(makeInput({ teamPrefix: "impl" }));

    expect(result).toContain("### 1. チーム作成");
    expect(result).toContain("team_name: impl-{入力ID}");
  });

  it("メンバー起動セクションに全メンバーの起動パラメータが含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### 2. メンバー起動");
    expect(result).toContain(
      "implementer と reviewer を同時に起動する（並列）",
    );
    expect(result).toContain('name: "implementer"');
    expect(result).toContain('name: "reviewer"');
  });

  it("ポーリング関係の説明が生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain(
      "reviewer は起動後、implementer に定期的に status_check を送信して進捗を確認する。",
    );
  });

  it("リーダーセクションにメンバー名が含まれる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### 3. リーダーの役割");
    expect(result).toContain("implementer / reviewer の進捗監視");
  });

  it("requiresUserApproval が true の場合、ユーザー承認フローが含まれる", () => {
    const result = generateTeamContent(
      makeInput({ requiresUserApproval: true }),
    );

    expect(result).toContain(
      "レビューPASS後、成果物をユーザーに提示して承認を得る",
    );
    expect(result).toContain("implementer に SendMessage で修正を依頼する");
  });

  it("requiresUserApproval が false/undefined の場合、ユーザー承認フローが含まれない", () => {
    const result = generateTeamContent(
      makeInput({ requiresUserApproval: false }),
    );

    expect(result).not.toContain("ユーザーに提示して承認を得る");
  });

  it("出力セクションが生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### 4. 出力");
    expect(result).toContain("- 結果のパス");
  });

  it("出力がない場合は出力セクションが省略される", () => {
    const result = generateTeamContent(makeInput({ output: undefined }));

    expect(result).not.toContain("### 4. 出力");
  });

  it("各teammateの作業内容セクションが生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("## implementer の作業内容");
    expect(result).toContain("### 役割");
    expect(result).toContain("implementerの役割説明");
    expect(result).toContain("#### W1. 作業開始");
    expect(result).toContain("作業を開始する。");

    expect(result).toContain("## reviewer の作業内容");
    expect(result).toContain("#### R1. ポーリング");
    expect(result).toContain("#### R2. レビュー実行");
  });

  it("statusCheckResponder のteammateにstatus_check応答ルールが生成される", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("### status_check への応答ルール");
    expect(result).toContain(
      'reviewer から `{type: "status_check"}` を受信する場合がある',
    );
    expect(result).toContain('{status: "working"}');
    expect(result).toContain('{status: "done", path: "{成果物ファイルパス}"}');
    expect(result).toContain('{status: "blocked", reason: "{理由}"}');
  });

  it("statusCheckResponder でないteammateにはstatus_checkルールが生成されない", () => {
    const result = generateTeamContent(makeInput());
    // reviewer セクション以降に status_check ルールが2回出ないことを確認
    const sections = result.split("## reviewer の作業内容");
    expect(sections[1]).not.toContain("### status_check への応答ルール");
  });

  it("communicationPatternがないteammateにはstatus_checkルールが生成されない", () => {
    const noPattern: LoadedTeammate = {
      name: "plain-worker",
      role: "パターンなし",
      steps: [{ id: "1", title: "作業", body: "作業する" }],
      sortOrder: 1,
    };
    const result = generateTeamContent(
      makeInput({ teammates: [noPattern, makeReviewer("plain-worker")] }),
    );
    const plainSection = result
      .split("## plain-worker の作業内容")[1]
      ?.split("## reviewer の作業内容")[0];
    expect(plainSection).not.toContain("### status_check への応答ルール");
  });

  it("teammateがsortOrder順にソートされる", () => {
    const teammates: LoadedTeammate[] = [
      { ...makeReviewer("worker"), sortOrder: 2 },
      { ...makeWorker("worker"), sortOrder: 1 },
    ];
    const result = generateTeamContent(makeInput({ teammates }));

    const workerIdx = result.indexOf("## worker の作業内容");
    const reviewerIdx = result.indexOf("## reviewer の作業内容");
    expect(workerIdx).toBeLessThan(reviewerIdx);
  });

  it("セクション間が --- で区切られる", () => {
    const result = generateTeamContent(makeInput());

    expect(result).toContain("---");
  });

  it("descriptionがない場合はヘッダーにスキル名のみが含まれる", () => {
    const result = generateTeamContent(makeInput({ description: undefined }));

    const lines = result.split("\n");
    expect(lines[0]).toBe("# Test Team");
    // 2行目は空行ではなく次のセクションの開始
    expect(lines[1]).toBe("");
  });
});
