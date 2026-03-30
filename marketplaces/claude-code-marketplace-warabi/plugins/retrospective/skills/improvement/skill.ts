// improvement スキル: retrospectiveレポートの分析とスキル改善

import { WorkerSkill, tool } from "../../../../../../app/lib/types";

const improvementSkill = new WorkerSkill({
  name: "improvement",
  description:
    "retrospectiveレポートを分析し、skillsの改善を考えて実施するスキル",
  userInvocable: true,
  allowedTools: [
    tool("Read"),
    tool("Write"),
    tool("Edit"),
    tool("Grep"),
    tool("Glob"),
    tool("Bash"),
    tool("AskUserQuestion"),
  ],
  content: `# Improvement

retrospectiveレポートを分析し、skillsの改善点を洗い出して実施する。

## 作業詳細

### Step 1: レポートの読み込み

\`~/claude-code-data/retrospectives/\` 配下のレポートを読み込む。

- 直近のレポートや、未分析のレポートを優先する
- 過去に分析済みかどうかはレポート末尾の \`## 分析済み\` セクションで判断する

### Step 2: 問題パターンの分析

レポートの実行記録から、改善すべきパターンを特定する:

- 繰り返し発生している問題
- skillの指示に従った結果、問題が生じたケース
- ステップの順序や情報受け渡しの問題
- 足りなかったステップ、不要だったステップ

### Step 3: 改善提案の作成

特定した問題に対する改善提案を作成する。各提案は以下の3段構成:

- **改善内容**: 具体的に何をどう変えるか
- **問題の前後サマリー**: どの作業で何をした結果、何が起きたか
- **理由**: なぜそれが問題で、この改善で解決するか

### Step 4: ユーザーとの確認

AskUserQuestionで対応する改善を確認する:
- 全て対応する
- 個別に選択する
- 今回はスキップ

### Step 5: 改善の実施

選択された改善を適用する:

- 対象の \`SKILL.md\` を編集
- 必要に応じて新規skillの作成や削除・統合を実施

**注意**:
- 一度に大きく変えすぎない。明確で自明な改善のみ適用する。
- ローカルClaude設定（skills, agents, CLAUDE.md）には具体的なプロジェクト名・リポジトリ名・ファイル名を含めない。プレースホルダー（\`{リポジトリ名}\`, \`{ファイル名}\`等）を使用する。

#### ブランチ処理

1. \`improve-skills/{識別子}\` ブランチを作成
2. 改善内容をコミット
   - コミットメッセージ: \`improve: {改善の要約}\`
3. リモートにプッシュ
4. \`gh pr create --draft\` でPRを作成

### Step 6: レポートの更新

分析したレポートの末尾に \`## 分析済み\` セクションを追加し、分析日と適用結果を記録する。

### Step 7: 結果報告

ユーザーに以下を報告する:
- 分析したレポートの一覧
- 適用した改善の一覧
- 作成したPRのURL（あれば）`,
});

export default improvementSkill;
