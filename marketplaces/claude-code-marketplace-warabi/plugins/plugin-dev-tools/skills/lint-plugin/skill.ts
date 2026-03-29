// lint-plugin スキル: プラグインのベストプラクティス違反チェックと自動修正

import { WorkerSkill, tool } from "../../../../../../app/lib/types";
import type { SupportFile } from "../../../../../../app/lib/types";

const rulesFile: SupportFile = {
  role: "REFERENCE",
  filename: "rules.md",
  sortOrder: 1,
};

const lintPluginSkill = new WorkerSkill({
  name: "lint-plugin",
  description:
    "作業ディレクトリ内のskills・agentsのbest practice違反をチェックし、自動修正する",
  allowedTools: [
    tool("Read"),
    tool("Write"),
    tool("Edit"),
    tool("Glob"),
    tool("Grep"),
  ],
  files: [rulesFile],
  content: `# Lint Settings

作業ディレクトリ内のskills・agentsのbest practice違反をチェックし、可能なものは自動修正する。

## 対象ファイル

- \`plugins/*/skills/*/SKILL.md\`
- \`plugins/*/agents/*.md\`

## lint ルール

[rules.md](rules.md) を参照。

ルールは check-updates および review-lint-rules によって更新される。

## 作業詳細

### Step 1: ルールの読み込み

[rules.md](rules.md) を読み込み、適用するルール一覧を把握する。

### Step 2: 対象ファイルの収集

\`plugins/*/skills/*/SKILL.md\` と \`plugins/*/agents/*.md\` を全て取得する。

### Step 3: 各ファイルのチェック

各ファイルに対して、rules.md に定義されたルールを適用する。

### Step 4: 自動修正の適用

「自動修正: ✅」のルールに違反している場合は直接ファイルを修正する。

### Step 5: レポート出力

チェック結果をユーザーに報告する:

\`\`\`
## Lint Results

### 自動修正済み
- plugins/xxx/skills/foo/SKILL.md: allowed-tools をYAMLリスト形式に変換
- plugins/xxx/skills/bar/SKILL.md: skills をYAMLリスト形式に変換

### 要手動対応
- plugins/xxx/skills/baz/SKILL.md: 存在しないスキル 'qux' を参照

### 問題なし
- plugins/xxx/skills/yyy/SKILL.md
- plugins/xxx/agents/zzz.md
\`\`\`

---

## 補足説明

### 単独実行

\`/lint-plugin\` で単独実行可能。check-updates からも呼び出される。`,
});

export default lintPluginSkill;
