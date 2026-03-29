// sentry-investigate スキル: Sentryエラーの原因調査と対応方針判定

import {
  WorkerWithSubAgent,
  tool,
  mcp,
} from "../../../../app/lib/types";
import type { SupportFile } from "../../../../app/lib/types";

const templateResultFile: SupportFile = {
  role: "TEMPLATE",
  filename: "template-result.md",
  sortOrder: 1,
};

const sentryInvestigateSkill = new WorkerWithSubAgent({
  name: "sentry-investigate",
  description:
    "Sentryエラーの原因を調査し、対応方針を判定するスキル。ワークフローの一部として使用される。",
  input: "Sentry issue の識別子（URLまたはissue ID）",
  output: "Sentry調査結果の保存先パス",
  allowedTools: [
    tool("Read"),
    tool("Grep"),
    tool("Glob"),
    tool("Write"),
    tool("Task"),
    tool("ToolSearch"),
    mcp("plugin_sentry_sentry", "get_issue_details"),
    mcp("plugin_sentry_sentry", "search_issue_events"),
    mcp("plugin_sentry_sentry", "analyze_issue_with_seer"),
    mcp("plugin_sentry_sentry", "get_trace_details"),
    mcp("plugin_sentry_sentry", "get_issue_tag_values"),
  ],
  files: [templateResultFile],
  agentConfig: {
    model: "sonnet",
    tools: [
      tool("Read"),
      tool("Grep"),
      tool("Glob"),
      tool("Write"),
      tool("ToolSearch"),
    ],
    content: "",
    description:
      "Sentryエラーの情報を取得・分析し、コードベースを横断的に調査して根本原因を特定するエージェント。対応方針の判定（修正が必要か無視してよいか）を行い、結果をファイルに書き出す。",
    sections: [
      {
        heading: "入力",
        body: "- Sentry issue の識別子（URLまたはissue ID）",
        position: "before-steps" as const,
      },
      {
        heading: "出力",
        body: "- Sentry調査結果の保存先パス",
        position: "before-steps" as const,
      },
      {
        heading: "セキュリティ",
        body: "セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。",
        position: "after-steps" as const,
      },
    ],
  },
  workerSteps: [
    {
      id: "1",
      title: "Sentry MCP ツールのロード",
      body: "ToolSearch で Sentry MCP ツールをロードする。",
    },
    {
      id: "2",
      title: "エラー詳細の取得",
      body: "get_issue_details でエラーの詳細情報を取得する:\n- エラータイトル・メッセージ\n- スタックトレース\n- タグ情報",
    },
    {
      id: "3",
      title: "イベント履歴の確認",
      body: "search_issue_events でイベント履歴を確認する:\n- 発生頻度\n- 影響ユーザー数\n- 発生期間",
    },
    {
      id: "4",
      title: "AI分析の実行",
      body: "analyze_issue_with_seer で AI による分析を実行し、追加の洞察を得る。",
    },
    {
      id: "5",
      title: "コードベース調査",
      body: "スタックトレースから関連コードを特定し、根本原因を調査する:\n- Grep/Read で関連コードを特定\n- web で起きたエラーでも原因が web にあるとは限らないため、横断的に調査する\n- エラーが発生するコードパスを追跡",
    },
    {
      id: "6",
      title: "対応方針の判定",
      body: "調査結果をもとに対応方針を判定する:\n- 対応が必要: 原因と修正方針の概要をまとめる\n- 無視してよい: 理由と無視方法を提案する（Sentry ignore 設定、captureException 呼び出し箇所の特定など）",
    },
    {
      id: "7",
      title: "結果の保存",
      body: "調査結果を template-result.md のフォーマットで ~/claude-code-data/workflows/{task-id}/sentry-investigation.md に書き出す。{task-id} は sentry-{issue-id} の形式。",
    },
    {
      id: "8",
      title: "結果返却",
      body: "調査結果の概要に加え、保存先パス（sentry-investigation.md のパス）を返す。",
    },
  ],
});

export default sentryInvestigateSkill;
