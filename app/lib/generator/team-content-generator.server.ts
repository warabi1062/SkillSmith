// チームスキル（WorkerWithAgentTeam）の content を teammates 定義から自動生成する

import type { LoadedTeammate } from "../types/loaded";
import { renderListSection } from "../core/section-utils";

export interface TeamContentInput {
  input?: string[]; // 入力の説明
  output?: string[]; // 出力の説明
  teammates: LoadedTeammate[]; // チームメンバー定義
  teamPrefix: string; // チーム名のプレフィックス
  additionalLeaderSteps?: string[]; // リーダーの追加手順（デフォルト手順に追記）
  requiresUserApproval?: boolean; // レビューPASS後にユーザー承認を得るか
}

// チーム共通ルールを構築する
export function buildTeamRules(memberNames: string[]): string[] {
  return [
    `各メンバーは定義された名前（${memberNames.join(", ")}）と完全一致する name でスポーンすること`,
    "レビューサイクルは最大3回で打ち切り、解決しない場合はユーザーに報告して判断を仰ぐ",
  ];
}

// リーダーのデフォルト担当リストを構築する
export function buildLeaderDuties(input: {
  memberNames: string[];
  requiresUserApproval?: boolean;
  additionalLeaderSteps?: string[];
}): string[] {
  const duties: string[] = [
    `${input.memberNames.join(" / ")} の進捗監視`,
    "定期的にメンバーの稼働状況を確認し、全メンバーが停止している場合は状況を調査して適切に teammate に指示を出す",
  ];
  if (input.requiresUserApproval) {
    duties.push("レビューPASS後、成果物をユーザーに提示して承認を得る");
    duties.push("フィードバックがあれば適切なメンバーに修正を依頼する");
  }
  if (input.additionalLeaderSteps) {
    duties.push(...input.additionalLeaderSteps);
  }
  duties.push("全メンバーの作業が完了したらチームを削除する");
  return duties;
}

export function generateTeamContent(input: TeamContentInput): string {
  const lines: string[] = [];

  const sortedTeammates = input.teammates.toSorted(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  const memberNames = sortedTeammates.map((t) => t.name);

  // 概要
  lines.push("");
  lines.push(
    `${memberNames.join("・")}の${memberNames.length}名体制で作業を行う。チームを作成し、下記Teammateセクションの各メンバーの役割・手順をプロンプトとして渡して起動する。メインエージェントはリーダーとして参加する。`,
  );

  // 入力セクション
  lines.push(...renderListSection("入力", input.input));

  // 出力セクション
  lines.push(...renderListSection("出力", input.output));

  // Teammate セクション
  lines.push("");
  lines.push("## Teammate");

  // 共通ルール
  lines.push("");
  const teamRules = buildTeamRules(memberNames);
  for (const rule of teamRules) {
    lines.push(`- ${rule}`);
  }

  // リーダー
  lines.push("");
  lines.push("### リーダー");
  lines.push("");
  lines.push("#### 役割");
  lines.push("チーム全体の進行管理を担当する。");
  lines.push("");
  lines.push("#### 担当");
  const leaderDuties = buildLeaderDuties({
    memberNames,
    requiresUserApproval: input.requiresUserApproval,
    additionalLeaderSteps: input.additionalLeaderSteps,
  });
  for (const duty of leaderDuties) {
    lines.push(`- ${duty}`);
  }

  // 各 teammate
  for (const teammate of sortedTeammates) {
    lines.push("");
    lines.push(`### ${teammate.name}`);
    lines.push("");
    lines.push("#### 役割");
    lines.push(teammate.role);
    lines.push("");
    lines.push("#### 手順");

    for (const step of teammate.steps) {
      lines.push("");
      lines.push(`##### ${step.id}. ${step.title}`);
      lines.push(step.body);
    }
  }

  return lines.join("\n");
}
