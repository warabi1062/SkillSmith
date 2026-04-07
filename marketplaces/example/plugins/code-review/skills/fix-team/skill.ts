// WorkerWithAgentTeam サンプル: CommunicationPattern responder
import { WorkerWithAgentTeam, tool } from "../../../../../../app/lib/types";

const fixTeamSkill = new WorkerWithAgentTeam({
  name: "fix-team",
  displayName: "Fix Team",
  description: "チームで重大な問題の修正を行うスキル",
  allowedTools: [tool("Read"), tool("Write"), tool("Edit")],
  input: ["深刻な指摘一覧", "対象ファイルパス"],
  output: ["修正済みコード", "検証レポート"],
  teamPrefix: "fix",
  teammates: [
    {
      name: "fixer",
      role: "指摘に基づいてコードを修正する",
      sortOrder: 1,
      steps: [
        {
          id: "1",
          title: "修正実装",
          body: "指摘された問題を修正するコードを実装する。",
        },
        {
          id: "2",
          title: "セルフレビュー",
          body: "修正内容が指摘を正しく解決しているか自己確認する。",
        },
      ],
    },
    {
      name: "verifier",
      role: "修正内容を検証し、品質を保証する",
      sortOrder: 2,
      // [14] CommunicationPattern responder
      communicationPattern: { type: "responder" },
      steps: [
        {
          id: "1",
          title: "修正検証",
          body: "fixerの修正が指摘を正しく解決しているか検証する。",
        },
        {
          id: "2",
          title: "回帰確認",
          body: "修正による副作用がないことを確認する。",
        },
      ],
    },
  ],
});

export default fixTeamSkill;
