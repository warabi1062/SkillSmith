// dev-lite スキル: 軽量版devワークフロー

import { EntryPointSkill } from "../../../../app/lib/types";
import implementSkill from "../implement/skill";
import createPrSkill from "../create-pr/skill";

const devLiteSkill = new EntryPointSkill({
  name: "dev-lite",
  description:
    "ユーザー指示から実装・レビュー・draft PR作成を簡易ステップで行う軽量版dev",
  argumentHint: "[説明]",
  allowedTools: [
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "Bash",
    "Task",
    "AskUserQuestion",
    "ToolSearch",
  ],
  dependencies: [implementSkill, createPrSkill],
  content: `# Dev Lite

\`$ARGUMENTS\` に対して、以下の簡易ワークフローを実行する。

dev の軽量版。plan-agent によるコードベース調査や plan review を省略し、最小限のステップで実装から PR 作成まで行う。

\`\`\`
[入力] → [タスクID生成] → [ブランチ作成] → [簡易Plan生成] → [Implement & Review] → [Create PR]
\`\`\`

---

## Step 1: タスクID生成

指示内容から短い slug を生成し、タスクIDとする。

\`\`\`
タスクID: quick-{slug}
例: quick-add-dark-mode
\`\`\`

## Step 2: ブランチ作成

ベースブランチを判定し、その最新を取得してから新しいブランチを作成して切り替える。（メインで実行）

ベースブランチの判定:
1. \`git branch -a\` で \`develop\` ブランチが存在するか確認する
2. 存在する場合 → \`develop\` をベースブランチとする（git flow）
3. 存在しない場合 → \`main\` または \`master\` をベースブランチとする（github flow）

\`\`\`
ブランチ名: feature/{タスクID}
例: feature/quick-add-dark-mode
\`\`\`

判定したベースブランチ名は \`~/claude-code-data/workflows/{タスクID}/base-branch.txt\` に保存し、そのパスを記録して後続のステップに渡す。

## Step 3: 簡易 Plan 生成（メインスレッドで実行）

plan-agent を使わず、オーケストレーター自身が簡易的な plan.md を生成する。

1. ユーザーの指示内容を分析する
2. 必要に応じてコードベースを簡単に確認する（Grep/Glob で関連ファイルを特定）
3. 以下のフォーマットで \`~/claude-code-data/workflows/{タスクID}/plan.md\` に書き出す:

\`\`\`markdown
# 実装計画: {タスクID}

## ゴール
{ユーザーの指示を1-2文で}

## 変更ファイル一覧
| ファイルパス | 変更内容 | 新規/修正 |
|------------|---------|----------|

## コミット計画
| # | コミット内容 | 対象ファイル | 依存 |
|---|------------|------------|------|

## テスト計画
| テストファイル | テスト内容 | 種別 |
|-------------|---------|------|

## 既存パターンへの準拠
- {プロジェクトで使われている規則があれば記載}
\`\`\`

実装計画の保存先パスを記録し、後続のステップに渡す。

注意:
- コードベースの深い調査は不要。指示内容と簡単なファイル確認で十分
- 完璧な計画ではなく、implement-agent が作業の方向性を掴める程度でよい
- plan review やユーザー承認は行わない

## Step 4: Implement & Review（実装・レビューサイクル）

### 4a: Implement

Task ツールを subagent_type: implement-agent で呼び出し、実装を委譲する。

渡す情報:
- タスクID
- 実装計画のパス（Step 3 で記録）

出力（agent の返却値から取得）:
- 実装結果のパス
- implement-agent の agent_id

### 4b: Review

Task ツールを subagent_type: review-agent で呼び出し、レビューを委譲する。

渡す情報:
- タスクID
- 実装計画のパス（Step 3 で記録）

出力:
- レビュー結果（PASS / NEEDS_REVISION）
- review-agent の agent_id

### 4c: 修正（NEEDS_REVISION の場合）

review-agent の指摘を、Step 4a で取得した implement-agent の agent_id に対して SendMessage(to: agent_id) で渡し修正させる。
修正後、Step 4b で取得した review-agent の agent_id に対して SendMessage(to: agent_id) で再レビューする。
（SendMessage はメインスレッドから直接呼ぶこと。Agentツールで委譲しない）

このサイクルは最大3回まで繰り返す。3回で解決しない場合はユーザーに報告して判断を仰ぐ。

## Step 5: Create PR（PR 作成）

Task ツールを subagent_type: create-pr-agent で呼び出し、draft PR 作成を委譲する。

渡す情報:
- タスクID
- モード: Quick
- 実装計画のパス（Step 3 で記録）
- 実装結果のパス（Step 4a で取得）
- ベースブランチ情報のパス（Step 2 で記録）

PR 作成後に追加の修正・push が発生した場合は、create-pr-agent の agent_id に対して SendMessage(to: agent_id) で呼び出す。

## 確認のスキップ

最終的にユーザーは PR でレビューするため、中間の確認はすべて省略してそのまま次のステップに進む。

## 注意事項

- 各ステップで問題が発生した場合はユーザーに報告して判断を仰ぐ
- Linear チケットは作成・更新しない（Quick mode）
- ユーザーからアプローチの変更提案があった場合は、即座に作業を中断し、plan.md を修正してから再開する

## 運用ルール

### ステップ間の情報受け渡し

ステップ間の情報受け渡しは会話コンテキストではなくファイルを介して行う。
- 各ステップの出力を \`~/claude-code-data/workflows/{タスクID}/\` 配下にファイルとして書き出す
- 次のステップは会話履歴ではなくファイルから前ステップの結果を読み込む`,
});

export default devLiteSkill;
