// review-lint-rules スキル: lintルールの定期見直しと改善

import { WorkerSkill, tool } from "../../../../../../app/lib/types";

const reviewLintRulesSkill = new WorkerSkill({
  name: "review-lint-rules",
  description:
    "lint-pluginのルールを定期的に見直し、不要ルールの削除やドキュメントに基づく改善を行う",
  allowedTools: [
    tool("Read"),
    tool("Write"),
    tool("Edit"),
    tool("Glob"),
    tool("Grep"),
    tool("WebFetch"),
    tool("WebSearch"),
  ],
  content: `# Review Lint Rules

lint-plugin のルールを定期的に見直し、最新のベストプラクティスに合わせて更新する。

## check-updates との違い

| スキル | トリガー | 目的 |
|--------|---------|------|
| check-updates | リリース時 | 新しいリリースに基づいてルールを追加 |
| review-lint-rules | 定期的（手動） | ルール全体の見直し・整理・削除 |

## 作業詳細

### Step 1: 公式ドキュメントの確認

以下のソースから最新のベストプラクティスを確認する:

- **Skills ドキュメント**: \`https://docs.anthropic.com/en/docs/claude-code/skills\`
- **Configuration ドキュメント**: \`https://docs.anthropic.com/en/docs/claude-code/configuration\`
- **Best Practices**: \`https://docs.anthropic.com/en/docs/claude-code/best-practices\`

### Step 2: 現在の lint ルールの棚卸し

同一プラグイン内の \`lint-plugin/SKILL.md\` と \`lint-plugin/rules.md\` を読み込み、現在のルール一覧を把握する。

各ルールについて以下を確認:
- ルールの目的は何か
- 今でも有効か（廃止されていないか）
- ドキュメントの推奨と一致しているか

### Step 3: ルールの評価

各ルールを以下の観点で評価する:

#### 削除候補
- 対象の機能が廃止された
- より良い代替ルールがある
- 実際に違反が発生しない（過度に厳しい）

#### 更新候補
- ドキュメントの推奨が変わった
- 自動修正ロジックを改善できる
- 説明文が古い

#### 追加候補
- ドキュメントに新しい推奨パターンがある
- 実際の運用で気づいた改善点

### Step 4: lint-plugin の更新

評価結果に基づいて同一プラグイン内の \`lint-plugin/SKILL.md\` と \`lint-plugin/rules.md\` を更新する:

- 不要なルールを削除
- 既存ルールの説明・ロジックを更新
- 新しいルールを追加

### Step 5: lint-plugin の実行

更新後、\`/lint-plugin\` を実行して動作確認する。

\`\`\`
Skillツールで lint-plugin を呼び出す
\`\`\`

### Step 6: レポート出力

見直し結果をユーザーに報告する:

\`\`\`markdown
## Lint Rules Review

### 確認日
{日付}

### 参照したドキュメント
- {URL}: {確認した内容}

### 削除したルール
- {ルール名}: {削除理由}

### 更新したルール
- {ルール名}: {変更内容と理由}

### 追加したルール
- {ルール名}: {追加理由}

### 変更なし
{変更が不要だった理由}
\`\`\`

### Step 7: コミット

変更をgit commitする。

---

## 補足説明

### 実行タイミング

- \`/check-updates\` とは別に、月1回程度の定期実行を推奨
- lint で false positive が多発した時
- 新しい Claude Code の大きなアップデート後`,
});

export default reviewLintRulesSkill;
