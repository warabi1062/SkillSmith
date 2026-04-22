// チームスキル（WorkerWithAgentTeam）の content を teammates 定義から自動生成する

import type { LoadedTeammate } from "../types/loaded";
import { renderListSection } from "../core/section-utils";

export interface TeamContentInput {
  skillName: string; // 親スキルの name（teammate agent の subagent_type prefix に使用）
  input?: string[]; // 入力の説明
  output?: string[]; // 出力の説明
  teammates: LoadedTeammate[]; // チームメンバー定義
  teamPrefix: string; // チーム名のプレフィックス
  additionalLeaderSteps?: string[]; // リーダーの追加手順（デフォルト手順に追記）
  requiresUserApproval?: boolean; // レビューPASS後にユーザー承認を得るか
}

// 全メンバーが従うメッセージ送受信の制約
const MEMBER_MESSAGING_CONSTRAINT =
  "メンバー間のメッセージ送受信は確認応答方式で行う。受信側はまず受領確認を送信元に返し、その後に作業を開始する。送信側は確認が返らない場合メッセージを再送する（最大5回）";

// teammate スポーン時（リーダーがメンバーを起動する瞬間）に適用されるルールを構築する
export function buildSpawnRules(params: {
  skillName: string;
  memberNames: string[];
}): string[] {
  const { skillName, memberNames } = params;
  const subagentTypes = memberNames
    .map((n) => `\`${skillName}-${n}\``)
    .join(" / ");
  const names = memberNames.map((n) => `\`${n}\``).join(" / ");
  return [
    `subagent_type に ${subagentTypes} を指定する（agent 定義ファイルと一致）`,
    `name パラメータには ${names}（teammate 名そのもの）を指定する。name はメッセージ送受信（SendMessage の to）・タスク所有者（TaskUpdate の owner）で使用される`,
    "prompt には、作業に必要な具体情報（前工程の成果物のファイルパス・対象モジュール・入力データ等）のみを自然言語で渡す。subagent は独立コンテキストで動作し親の会話履歴を参照できないため、こうした情報は prompt に含めないと伝わらない。例: 「implementer agent として、~/.claude/workflows/{task-id}/plan.md に記載された計画を実装してください」",
    "各メンバーの役割・制約・手順は agent 定義ファイル側に記述済みのため絶対に prompt へ再掲しない（二重指示は挙動不安定化の原因になる）",
  ];
}

// 各メンバーに転記する制約リストを構築する
export function buildMemberConstraints(): string[] {
  return [MEMBER_MESSAGING_CONSTRAINT];
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
    "レビューサイクルは最大3回で打ち切り、解決しない場合はユーザーに報告して判断を仰ぐ",
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
    `${memberNames.join("・")}の${memberNames.length}名体制で作業を行う。チームを作成し、各メンバーを agent type 指定でスポーンする。メインエージェントはリーダーとして参加する。メンバーの役割・制約・手順は各 agent 定義ファイルに記述済みのため、リーダーはそれらを prompt に再掲せず、起動指示のみを渡す。`,
  );

  // 入力セクション
  lines.push(...renderListSection("入力", input.input));

  // 出力セクション
  lines.push(...renderListSection("出力", input.output));

  // Teammate セクション
  lines.push("");
  lines.push("## Teammate");

  // スポーン時のルール（リーダーがメンバーを起動する瞬間に適用）
  lines.push("");
  lines.push("### Teammate スポーンに関するルール");
  lines.push("");
  lines.push(
    "リーダーが各メンバーを Agent tool でスポーンする際、以下に従う。",
  );
  lines.push("");
  const spawnRules = buildSpawnRules({
    skillName: input.skillName,
    memberNames,
  });
  for (const rule of spawnRules) {
    lines.push(`- ${rule}`);
  }

  // リーダー
  lines.push("");
  lines.push("### リーダー");
  lines.push("");
  lines.push("#### 役割");
  lines.push("チーム全体の進行管理を担当する。");
  lines.push("");
  lines.push("#### 制約");
  for (const constraint of buildMemberConstraints()) {
    lines.push(`- ${constraint}`);
  }
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

  // 各 teammate は役割 + subagent_type の軽量な索引として出力する
  for (const teammate of sortedTeammates) {
    const prefixedName = `${input.skillName}-${teammate.name}`;
    lines.push("");
    lines.push(`### ${teammate.name}`);
    lines.push("");
    lines.push(
      `${teammate.role} \`subagent_type: ${prefixedName}\` でスポーンする。`,
    );
  }

  return lines.join("\n");
}
