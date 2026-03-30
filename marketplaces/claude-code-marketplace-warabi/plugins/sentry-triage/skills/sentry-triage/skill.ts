// sentry-triage スキル: SentryエラーのトリアージとLinear起票のオーケストレーター

import { EntryPointSkill, tool } from "../../../../../../app/lib/types";
import sentryInvestigateSkill from "../sentry-investigate/skill";

const sentryTriageSkill = new EntryPointSkill({
  name: "sentry-triage",
  description:
    "Sentryエラーを調査・トリアージし、対応要否の判断とLinear起票を行う",
  argumentHint: "[SENTRY_URL or ISSUE_ID]",
  userInvocable: true,
  allowedTools: [
    tool("Read"),
    tool("Write"),
    tool("Glob"),
    tool("Grep"),
    tool("Bash"),
    tool("Task"),
    tool("AskUserQuestion"),
    tool("ToolSearch"),
  ],
  steps: [
    sentryInvestigateSkill,
    {
      inline: "ユーザー判定",
      steps: [
        {
          id: "1",
          title: "調査結果の読み込み",
          body: "sentry-investigate から返却された調査結果ファイルのパスを読み込み、内容をユーザーに提示する。",
        },
        {
          id: "2",
          title: "対応方針の確認",
          body: "ユーザーに対応方針を確認する:\n- **対応する** → 次のステップ（Linear起票）へ\n- **対応しない** → 調査結果の「無視方法」があればそれを報告して終了",
        },
      ],
    },
    {
      inline: "Linear起票",
      steps: [
        {
          id: "1",
          title: "Linear MCPツールのロード",
          body: "ToolSearch で Linear MCP ツール（save_issue）をロードする。",
        },
        {
          id: "2",
          title: "issue作成",
          body: "調査結果ファイルから以下を抽出してissueを作成する:\n- title: エラータイトルをベースに簡潔なissueタイトルを生成\n- description: Sentry issueへのリンク、エラー概要、根本原因、関連コード、修正方針をMarkdownで構成\n- team: ユーザーに確認する（初回のみ）\n- labels: bug ラベルがあれば付与\n- priority: 発生頻度・影響範囲から判断（Urgent=1, High=2, Normal=3, Low=4）",
        },
        {
          id: "3",
          title: "結果報告",
          body: "作成されたLinear issueのIDとURLをユーザーに報告して終了する。",
        },
      ],
    },
  ],
  sections: [
    {
      heading: "注意事項",
      body: "- 各ステップで問題が発生した場合はユーザーに報告して判断を仰ぐ\n- Sentry の内部URL、APIキー、個人情報はLinear issueの description に含めないこと",
      position: "after-steps",
    },
  ],
});

export default sentryTriageSkill;
