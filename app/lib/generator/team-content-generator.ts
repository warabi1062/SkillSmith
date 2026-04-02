// チームスキル（WorkerWithAgentTeam）の content を teammates 定義から自動生成する

import type { LoadedTeammate } from "../types/loader.server";

export interface TeamContentInput {
  input?: string[]; // 入力の説明
  output?: string[]; // 出力の説明
  teammates: LoadedTeammate[]; // チームメンバー定義
  teamPrefix: string; // チーム名のプレフィックス
  additionalLeaderSteps?: string[]; // リーダーの追加手順（デフォルト手順に追記）
  requiresUserApproval?: boolean; // レビューPASS後にユーザー承認を得るか
}

export function generateTeamContent(input: TeamContentInput): string {
  const lines: string[] = [];

  const sortedTeammates = input.teammates
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const memberNames = sortedTeammates.map((t) => t.name);

  // 概要
  lines.push("");
  lines.push(
    `${memberNames.join("・")}の${memberNames.length}名体制で作業を行う。チームを作成し、下記Teammateセクションの各メンバーの役割・手順をプロンプトとして渡して起動する。メインエージェントはリーダーとして参加する。`,
  );

  // 入力セクション
  if (input.input?.length) {
    lines.push("");
    lines.push("## 入力");
    lines.push("");
    lines.push(...input.input);
  }

  // 出力セクション
  if (input.output?.length) {
    lines.push("");
    lines.push("## 出力");
    lines.push("");
    lines.push(...input.output);
  }

  // Teammate セクション
  lines.push("");
  lines.push("## Teammate");

  // リーダー
  lines.push("");
  lines.push("### リーダー");
  lines.push("");
  lines.push("#### 役割");
  lines.push("チーム全体の進行管理を担当する。");
  lines.push("");
  lines.push("#### 担当");
  // デフォルトのリーダー担当
  lines.push(`- ${memberNames.join(" / ")} の進捗監視`);
  lines.push("- レビューサイクルが最大3回で打ち切られることの管理");
  lines.push("- 3回で解決しない場合はユーザーに報告して判断を仰ぐ");

  if (input.requiresUserApproval) {
    const worker = sortedTeammates.find(
      (t) => t.communicationPattern?.type === "responder",
    );
    const workerName = worker?.name ?? memberNames[0];
    lines.push("- レビューPASS後、成果物をユーザーに提示して承認を得る");
    lines.push(`- フィードバックがあれば ${workerName} に修正を依頼する`);
  }

  // スキル定義からの追加手順
  if (input.additionalLeaderSteps) {
    for (const step of input.additionalLeaderSteps) {
      lines.push(`- ${step}`);
    }
  }

  lines.push("- 全メンバーの作業が完了したらチームを削除する");

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
