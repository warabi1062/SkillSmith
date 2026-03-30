// チームスキル（WorkerWithAgentTeam）の content を teammates 定義から自動生成する

import type { LoadedTeammate } from "../types/loader.server";

export interface TeamContentInput {
  description?: string; // スキルの説明（TeamCreateのdescriptionに使用）
  input?: string; // 入力の説明
  output?: string; // 出力の説明
  teammates: LoadedTeammate[]; // チームメンバー定義
  teamPrefix: string; // チーム名のプレフィックス
  requiresUserApproval?: boolean; // レビューPASS後にユーザー承認を得るか
}

export function generateTeamContent(input: TeamContentInput): string {
  const lines: string[] = [];

  // 入力セクション
  if (input.input) {
    lines.push("");
    lines.push("## 入力");
    lines.push("");
    lines.push(input.input);
  }

  // 手順セクション
  lines.push("");
  lines.push("## 手順");

  // 1. チーム作成
  const memberNames = input.teammates
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((t) => t.name);

  lines.push("");
  lines.push("### 1. チーム作成");
  lines.push("");
  lines.push("TeamCreate でチームを作成する。");
  lines.push("");
  lines.push("```");
  lines.push(`team_name: ${input.teamPrefix}-{入力ID}`);
  if (input.description) {
    lines.push(`description: ${input.description}`);
  }
  lines.push("```");

  // 2. メンバー起動
  lines.push("");
  lines.push("### 2. メンバー起動");
  lines.push("");
  lines.push(
    `Agent ツールで ${memberNames.join(" と ")} を同時に起動する（並列）。`,
  );

  for (const name of memberNames) {
    lines.push("");
    lines.push(`${name} の起動:`);
    lines.push("```");
    lines.push("Agent(");
    lines.push(`  team_name: "${input.teamPrefix}-{入力ID}",`);
    lines.push(`  name: "${name}",`);
    lines.push(
      `  prompt: 以下の「${name} の作業内容」セクションの指示 + 入力情報`,
    );
    lines.push(")");
    lines.push("```");
  }

  // ポーリング関係の説明を追加
  const pollers = input.teammates.filter(
    (t) => t.communicationPattern?.type === "poller",
  );
  for (const poller of pollers) {
    const pattern = poller.communicationPattern as {
      type: "poller";
      target: string;
    };
    lines.push("");
    lines.push(
      `${poller.name} は起動後、${pattern.target} に定期的に status_check を送信して進捗を確認する。`,
    );
  }

  // 3. リーダーの役割
  lines.push("");
  lines.push("### 3. リーダーの役割");
  lines.push("");
  lines.push("メインエージェント（リーダー）は以下を担当する:");
  lines.push("");
  lines.push(`- ${memberNames.join(" / ")} の進捗監視`);
  lines.push("- レビューサイクルが最大3回で打ち切られることの管理");
  lines.push("- 3回で解決しない場合はユーザーに報告して判断を仰ぐ");

  if (input.requiresUserApproval) {
    // worker（responder）の名前を特定
    const worker = input.teammates.find(
      (t) => t.communicationPattern?.type === "responder",
    );
    const workerName = worker?.name ?? memberNames[0];
    lines.push("- レビューPASS後、成果物をユーザーに提示して承認を得る");
    lines.push(
      `- フィードバックがあれば ${workerName} に SendMessage で修正を依頼する`,
    );
  }

  lines.push("- チーム完了後のシャットダウン:");
  lines.push(
    '  1. 全teammateに SendMessage で `{type: "shutdown_request"}` を送信',
  );
  lines.push("  2. 各teammateの `shutdown_response`（approve）を確認");
  lines.push(
    "  3. 全員がシャットダウンしたら TeamDelete でチームリソースを削除",
  );

  // 4. 出力
  if (input.output) {
    lines.push("");
    lines.push("### 4. 出力");
    lines.push("");
    lines.push(input.output);
  }

  // 各 teammate のセクション
  const sortedTeammates = input.teammates
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  for (const teammate of sortedTeammates) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(`## ${teammate.name} の作業内容`);
    lines.push("");
    lines.push("### 役割");
    lines.push(teammate.role);
    lines.push("");
    lines.push("### 手順");

    for (const step of teammate.steps) {
      lines.push("");
      lines.push(`#### ${step.id}. ${step.title}`);
      lines.push(step.body);
    }

    // status_check 応答ルール（responder の場合）
    if (teammate.communicationPattern?.type === "responder") {
      lines.push("");
      lines.push("### status_check への応答ルール");
      // ポーリング元の名前を特定
      const poller = input.teammates.find(
        (t) =>
          t.communicationPattern?.type === "poller" &&
          (t.communicationPattern as { type: "poller"; target: string })
            .target === teammate.name,
      );
      const pollerName = poller?.name ?? "reviewer";
      lines.push(
        `作業中のどの時点でも、${pollerName} から \`{type: "status_check"}\` を受信する場合がある。受信したら現在の状況を即座に返信する:`,
      );
      lines.push("");
      lines.push('- `{status: "working"}` — まだ作業中');
      lines.push(
        '- `{status: "done", path: "{成果物ファイルパス}"}` — 作業完了またはレビュー指摘への対応完了。レビュー可能',
      );
      lines.push(
        '- `{status: "blocked", reason: "{理由}"}` — ブロックされている',
      );
    }
  }

  return lines.join("\n");
}
