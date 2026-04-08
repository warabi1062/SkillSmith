// WorkerSkill サンプル: beforeSections, mcp(), disableModelInvocation, userInvocable オーバーライド
import { WorkerSkill, tool, mcp } from "../../../../../../app/lib/types";

const analyzeDiffSkill = new WorkerSkill({
  name: "analyze-diff",
  description: "PRの差分を分析し、深刻度を判定するワーカースキル",
  // [11] mcp() ツール参照
  allowedTools: [tool("Read"), tool("Grep"), mcp("github", "get_pull_request")],
  // [12] disableModelInvocation
  disableModelInvocation: true,
  // [13] Worker に対する明示的 userInvocable オーバーライド
  userInvocable: true,
  input: ["PR番号またはブランチ名"],
  output: ["差分分析レポート", "深刻度判定（critical / normal / trivial）"],
  // beforeSections
  beforeSections: [
    {
      heading: "分析方針",
      body: "変更の意図・影響範囲・リスクの3軸で分析を行う。セキュリティ関連の変更は必ず critical と判定すること。",
    },
  ],
  workerSteps: [
    {
      id: "1",
      title: "差分取得",
      body: "対象PRの差分を取得し、変更ファイル一覧を作成する。",
    },
    {
      id: "2",
      title: "詳細分析",
      body: "変更されたファイルごとに以下の観点で分析する:\n\n1. **変更の意図**: コミットメッセージとコードの整合性\n2. **影響範囲**: 変更が他のモジュールに与える影響\n3. **リスク評価**: セキュリティ・パフォーマンス・互換性の観点",
    },
    {
      id: "3",
      title: "深刻度判定",
      body: "分析結果に基づき、変更の深刻度を critical / normal / trivial のいずれかに分類する。",
    },
  ],
});

export default analyzeDiffSkill;
