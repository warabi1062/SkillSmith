// triage-github-pr-comments スキル: PRレビューコメントの妥当性判断とコード修正

import { EntryPointSkill } from "../../../../app/lib/types";

const triageGithubPrCommentsSkill = new EntryPointSkill({
  name: "triage-github-pr-comments",
  description:
    "GitHub PRのレビューコメントURLを受け取り、指摘の妥当性を判断してコード修正で対応する",
  argumentHint: "[コメントURL]",
  allowedTools: [
    "Read",
    "Write",
    "Edit",
    "Grep",
    "Glob",
    "Bash(gh *)",
    "Bash(git diff *)",
    "Bash(git log *)",
  ],
  content: `# Address Review

GitHub PRのレビューコメントURLを受け取り、指摘内容を確認してコード修正を行う。

## 入力

\`$ARGUMENTS\` にGitHubのコメントURLが渡される。

対応するURLパターン:
- \`https://github.com/{owner}/{repo}/pull/{PR}#discussion_r{id}\` (インラインレビューコメント)
- \`https://github.com/{owner}/{repo}/pull/{PR}#issuecomment-{id}\` (一般コメント)
- \`https://github.com/{owner}/{repo}/pull/{PR}#pullrequestreview-{id}\` (レビュー本文)

## 手順

### 1. URL解析

\`$ARGUMENTS\` のURLからowner、repo、PR番号、コメント種別、コメントIDを抽出する。

| URLフラグメント | 種別 | API |
|---|---|---|
| \`#discussion_r{id}\` | インラインレビューコメント | \`gh api repos/{owner}/{repo}/pulls/comments/{id}\` |
| \`#issuecomment-{id}\` | 一般コメント | \`gh api repos/{owner}/{repo}/issues/comments/{id}\` |
| \`#pullrequestreview-{id}\` | レビュー本文 | \`gh api repos/{owner}/{repo}/pulls/{PR}/reviews/{id}\` |

### 2. コメント取得

該当のAPIでコメント本文を取得する。

インラインレビューコメントの場合、スレッドの他のコメントも取得して議論の文脈を把握する:
- \`gh api repos/{owner}/{repo}/pulls/comments/{id}\` でコメントの \`pull_request_review_id\` を取得
- 同じ \`pull_request_review_id\` かつ同じ \`path\` + \`original_line\` を持つコメントを \`gh api repos/{owner}/{repo}/pulls/{PR}/comments --paginate\` から検索してスレッドを復元

### 3. コンテキスト収集

- インラインコメントの場合: \`path\` フィールドの対象ファイルをReadで読み込み、\`diff_hunk\` で変更箇所を特定
- 一般コメント/レビュー本文の場合: \`gh pr diff {PR}\` でPR全体の差分を確認し、指摘に関連するファイルを特定
- 必要に応じて関連コードをGrep/Globで調査

### 4. 妥当性判定

コメントを以下のいずれかに分類する:

- FIX: 正しい問題指摘、または有効な改善提案。コード修正で対応する
- SKIP: 対応不要。以下のいずれかに該当する場合
  - 事実誤認（コードの読み間違い、仕様の誤解）
  - 既に対応済み
  - 好みの問題で現状が妥当
  - 質問のみで修正不要
  - スコープ外の指摘

迷う場合はFIX寄りで判断する（レビュアーの指摘を尊重）。

### 5. コード修正（FIXの場合）

Edit/Writeツールを使ってコードを修正する。修正内容はコメントの指摘に沿ったものとする。

### 6. 結果報告

判定結果と対応内容を報告する。

FIXの場合:
\`\`\`
## レビュー対応結果

コメント: {コメントURL}
判定: FIX
対応: {修正内容の説明}
変更ファイル: {ファイル一覧}

commit/pushは行っていません。内容を確認のうえ実行してください。
\`\`\`

SKIPの場合:
\`\`\`
## レビュー対応結果

コメント: {コメントURL}
判定: SKIP
理由: {スキップ理由の説明}
\`\`\`

## 注意事項

- commit/pushは実行しない。修正の確認・コミットはユーザーに委ねる`,
});

export default triageGithubPrCommentsSkill;
