// review-pr スキル: GitHub PRをレビューし総評を報告

import { WorkerSkill, tool, bash } from "../../../../../../app/lib/types";

const reviewPrSkill = new WorkerSkill({
  name: "review-pr",
  description:
    "openしたGitHub PRをレビューし、総評をユーザーに報告するスキル。単独で使用可能。",
  argumentHint: "[PR番号 or PR_URL]",
  userInvocable: true,
  allowedTools: [tool("Read"), tool("Grep"), tool("Glob"), bash("gh *"), tool("Task")],
  content: `# Review PR

\`$ARGUMENTS\` に対して、GitHub PRの変更内容をレビューし、総評をユーザーに報告する。

## 作業詳細

### Step 1: PR情報取得

\`gh pr view\` でPRのメタ情報を取得する。

- タイトル、本文、ベースブランチ、作成者
- ステータス（open であることを確認）

### Step 2: 差分取得・分析

\`gh pr diff\` でPRの全差分を取得し、以下の観点でレビューする。

#### レビュー観点

- **セキュリティ**: セキュリティ上の問題がないか
- **バグ**: ロジックにバグの可能性がないか
- **可読性・保守性**: コードの構造が明確で保守しやすいか
- **テスト**: 変更に対してテストが適切に追加・更新されているか
- **命名**:
  - 命名規則に一貫性があるか
  - 名前が実態に即しているか
  - 曖昧な名前になっていないか
- **PR description**:
  - descriptionに書かれた目的・変更内容と、実際の実装が一致しているか
  - descriptionに記載のない変更が含まれていないか

### Step 3: コードベース確認

差分だけでは判断できない箇所について、関連するコードを読んで文脈を把握する。

- 変更されたファイルの周辺コード
- 呼び出し元・呼び出し先
- 既存のテストパターン

### Step 4: 結果報告

以下のフォーマットでユーザーに報告する:

\`\`\`
## Code Review

### 総評
{全体的な評価を1-2文で}

### 良い点
{良い変更点を箇条書き}

### 指摘事項
{問題点や改善案を箇条書き。重要度を明記: 🔴 Must / 🟡 Should / 🔵 Nit}

### 質問
{意図が不明な箇所への質問。なければ省略}
\`\`\`

指摘事項がない場合は「指摘事項」セクションを \`特になし\` とする。`,
});

export default reviewPrSkill;
