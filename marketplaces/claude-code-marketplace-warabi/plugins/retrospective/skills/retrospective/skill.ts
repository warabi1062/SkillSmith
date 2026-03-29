// retrospective スキル: 作業完了後の実行結果を構造化して記録

import { WorkerSkill, tool } from "../../../../../../app/lib/types";
import type { SupportFile } from "../../../../../../app/lib/types";

const templateFile: SupportFile = {
  role: "TEMPLATE",
  filename: "template.md",
  sortOrder: 1,
};

const retrospectiveSkill = new WorkerSkill({
  name: "retrospective",
  description: "作業完了後に実行結果を構造化して記録するスキル",
  allowedTools: [tool("Read"), tool("Write"), tool("Glob")],
  files: [templateFile],
  content: `# Retrospective

作業の実行結果を構造化して記録する。

## 入力

直前の作業コンテキストがそのまま利用できる。

## 作業詳細

### Step 1: 作業の振り返り

実施した作業の各ステップについて事実を整理する。

- 各ステップで何をしたか
- 期待通りに動いたか
- 問題が発生したか（事実として）

### Step 2: レポート作成

[template.md](template.md) のフォーマットで \`~/claude-code-data/retrospectives/{識別子}.md\` に書き出す。
識別子はチケットID、日付、作業名など作業に応じて決定する。

### Step 3: 結果報告

ユーザーにレポートのパスを報告する。`,
});

export default retrospectiveSkill;
