// WorkerWithSubAgent サンプル: AgentConfig description + sections（自動生成モード）, model
import {
  WorkerWithSubAgent,
  tool,
  bash,
} from "../../../../../../app/lib/types";

const suggestFixSkill = new WorkerWithSubAgent({
  name: "suggest-fix",
  displayName: "Suggest Fix",
  description: "レビュー指摘に対する修正案を提案するスキル（Sub Agent付き）",
  allowedTools: [tool("Read"), tool("Write"), tool("Edit")],
  input: ["レビュー指摘一覧", "対象ファイルパス"],
  output: ["修正提案レポート"],
  workerSteps: [
    {
      id: "1",
      title: "指摘内容の整理",
      body: "レビュー指摘を深刻度順にソートし、対応方針を決定する。",
    },
    {
      id: "2",
      title: "修正案の作成",
      body: "各指摘に対して具体的なコード修正案を作成する。修正前後の差分を明示すること。",
    },
  ],
  // [7] AgentConfig description + sections による自動生成モード
  // [15] AgentConfig.model
  agentConfig: {
    content: "",
    description:
      "コードレビューの指摘に基づいて修正案を提案する専門Agent。コードの品質を維持しつつ、最小限の変更で問題を解決する。",
    model: "sonnet",
    tools: [tool("Read"), tool("Write"), tool("Edit"), bash("git diff *")],
    sections: [
      {
        heading: "修正パターン",
        body: "- バグ修正: 根本原因を特定し、副作用のない修正を提案する\n- リファクタリング: 既存の動作を変えずに構造を改善する\n- セキュリティ修正: OWASP Top 10 に準拠した対策を提案する",
        position: "before-steps",
      },
    ],
  },
});

export default suggestFixSkill;
