// dev-mentor スキル: AIメンター型の学習型開発ワークフロー

import { EntryPointSkill } from "../../../../app/lib/types";

const devMentorSkill = new EntryPointSkill({
  name: "dev-mentor",
  description:
    "AIがメンターとして計画・ガイド・レビューを行い、人間が実装する学習型開発ワークフロー",
  argumentHint: "[LINEAR_ISSUE_ID or 説明]",
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
  content: `# Dev Mentor

\`$ARGUMENTS\` に対して、以下のワークフローを順番に実行する。

dev skill と同じ流れで計画・レビュー・PR作成をAIが担当するが、実装は人間が行う。AIはステップバイステップの実装ガイドを提示し、質問対応やコードレビューでメンターとして支援する。

## 入力判定

以下の順序で判定する:

1. Linear URLを含む（\`linear.app\` を含むURLパターン）→ Linearモード
2. \`^[A-Z]+-\\d+$\` にマッチ（例: LIN-123, PROJ-456）→ Linearモード
3. それ以外 → Quickモード

\`\`\`
[入力判定]
    ├── Linearモード ──→ [Triage] → [Triage Review] → [ユーザー承認] → [Triage Execute] → [ID確定]
    │
    └── Quickモード ──→ [タスクID生成]
            │
            ↓
    [ブランチ作成]
            ↓
    [Plan & Plan Review]
            ↓
    [実装ガイド生成]
            ↓
    [人間が実装] ← ユーザーがコードを書く
            ↓
    [コードレビュー & フィードバック]
            ↓
    [Create PR]
\`\`\`

---

## Linearモード専用ステップ

### Step L1: Triage（調査・計画）

Taskツールを subagent_type: triage-agent で呼び出し、チケット \`$ARGUMENTS\` の調査・計画作成を委譲する。

渡す情報:
- チケットID

出力（agent の返却値から取得）:
- triage計画のパス
- triage-agent の agent_id

### Step L2: Triage Review（計画レビュー）

Taskツールを subagent_type: triage-review-agent で呼び出し、計画のレビューを委譲する。

渡す情報:
- チケットID
- triage計画のパス（Step L1 で取得）

出力:
- レビュー結果（PASS / NEEDS_REVISION）
- triage-review-agent の agent_id

NEEDS_REVISIONの場合、Step L1 で取得した triage-agent の agent_id に対して SendMessage(to: agent_id) で指摘を渡し修正させる。
修正後、Step L2 で取得した triage-review-agent の agent_id に対して SendMessage(to: agent_id) で再レビューする。
このサイクルは最大3回まで繰り返す。3回で解決しない場合はユーザーに報告して判断を仰ぐ。

**注意: SendMessage はオーケストレーター（メインスレッド）が直接呼び出すこと。Agentツールで別のagentに委譲してはならない。**

### Step L3: ユーザー承認

レビューPASSした計画（\`triage-plan.md\`）の内容をユーザーに提示し、承認を得る。
フィードバックがあれば triage-agent の agent_id に対して SendMessage(to: agent_id) で修正を依頼する。

### Step L4: Triage Execute（計画実行）

Taskツールを subagent_type: triage-execute-agent で呼び出し、承認済み計画の実行を委譲する。

渡す情報:
- チケットID
- triage計画のパス（Step L1 で取得）

出力（agent の返却値から取得）:
- triage結果のパス

分割が発生した場合、ユーザーにどのサブチケットから着手するか確認を取る。

---

## Quickモード専用ステップ

### Step Q1: タスクID生成

指示内容から短いslugを生成し、タスクIDとする。

\`\`\`
タスクID: quick-{slug}
例: quick-add-dark-mode
\`\`\`

---

## 共通ステップ

以下のステップは全モードで共通。\`{ID}\` はLinearモードではチケットID、Quickモードではタスクidを指す。

### Step 1: ブランチ作成

対象が確定したら、実装を始める前にベースブランチを判定し、ブランチを作成して切り替える。（メインで実行）

ベースブランチの判定:
1. \`git branch -a\` で \`develop\` ブランチが存在するか確認する
2. 存在する場合 → \`develop\` をベースブランチとする（git flow）
3. 存在しない場合 → \`main\` または \`master\` をベースブランチとする（github flow）

\`\`\`
ブランチ名: feature/{ID}-{タイトルのslug}
例（Linear）: feature/LIN-123-add-user-authentication
例（Quick）: feature/quick-add-dark-mode
\`\`\`

- ベースブランチの最新を取得
- 新しいブランチを作成して切り替え
- 判定したベースブランチ名は \`~/claude-code-data/workflows/{ID}/base-branch.txt\` に保存し、そのパスを記録して後続のステップに渡す

### Step 2: Plan & Plan Review（実装計画・レビューサイクル）

#### 2a: Plan

Taskツールを subagent_type: plan-agent で呼び出し、計画作成を委譲する。

渡す情報:
- Linearモードの場合: チケットID + triage結果のパス（Step L4 で取得）
- Quickモードの場合: ユーザーの指示を要件として渡す

出力（agent の返却値から取得）:
- 実装計画のパス
- plan-agent の agent_id

#### 2b: Plan Review

plan-review-agent に計画のレビューを委譲する。

渡す情報:
- チケットID
- 実装計画のパス（Step 2a で取得）

出力:
- レビュー結果（PASS / NEEDS_REVISION）
- plan-review-agent の agent_id

#### 2c: 修正（NEEDS_REVISIONの場合）

plan-review-agent の指摘を、Step 2a で取得した plan-agent の agent_id に対して SendMessage(to: agent_id) で渡し修正させる。
修正後、Step 2b で取得した plan-review-agent の agent_id に対して SendMessage(to: agent_id) で再レビューする。
（SendMessage はメインスレッドから直接呼ぶこと。Agentツールで委譲しない）

このサイクルは最大3回まで繰り返す。3回で解決しない場合はユーザーに報告して判断を仰ぐ。

#### 2d: ユーザー承認

レビューをPASSした計画をユーザーに提示し、承認を得る。フィードバックがあれば修正する。

### Step 3: 実装ガイド生成

Taskツールを subagent_type: guide-agent で呼び出し、ステップバイステップの実装ガイドを生成する。

渡す情報:
- タスクID（\`{ID}\`）
- 実装計画のパス（Step 2a で取得）

出力（agent の返却値から取得）:
- 実装ガイドのパス

### Step 4: メンターセッション（人間が実装）

Taskツールを subagent_type: mentor-agent で呼び出し、ユーザーの実装支援を委譲する。

渡す情報:
- タスクID
- 実装ガイドのパス（Step 3 で取得）

mentor-agent の agent_id を記録する。

mentor-agent がユーザーとの対話を行い、ガイドの提示・質問対応・ヒント提供を担当する。
ユーザーが「レビューして」「done」等と伝えると mentor-agent が返ってくる。

mentor-agent が「plan修正が必要」と報告した場合は、Step 2 に戻って計画を修正する。

### Step 5: コードレビュー & フィードバック

#### 5a: Review

Taskツールを subagent_type: review-agent で呼び出し、レビューを委譲する。

渡す情報:
- タスクID
- 実装計画のパス（Step 2a で取得）

出力:
- レビュー結果（PASS / NEEDS_REVISION）
- review-agent の agent_id

#### 5b: フィードバック & 修正（NEEDS_REVISIONの場合）

review-agent の指摘を、Step 4 で取得した mentor-agent の agent_id に対して SendMessage(to: agent_id) で渡し、教育的なフィードバック提示とユーザーの修正支援を委譲する。

渡す情報:
- レビュー結果（指摘内容）

mentor-agent がユーザーに問題点の説明・修正ヒントを提示し、修正を支援する。
ユーザーが修正完了を伝えると mentor-agent が返ってくる。

修正後、Step 5a で取得した review-agent の agent_id に対して SendMessage(to: agent_id) で再レビューする。
（SendMessage はメインスレッドから直接呼ぶこと。Agentツールで委譲しない）

このサイクルは最大3回まで繰り返す。3回で解決しない場合はユーザーに報告して判断を仰ぐ。

### Step 6: Create PR（PR作成）

Taskツールを subagent_type: create-pr-agent で呼び出し、PR作成を委譲する。

渡す情報:
- タスクID
- モード（Linear / Quick）
- 実装計画のパス（Step 2a で取得）
- ベースブランチ情報のパス（Step 1 で記録）

PR作成後に追加の修正・pushが発生した場合は、create-pr-agent の agent_id に対して SendMessage(to: agent_id) で呼び出す。

## 注意事項

- 各ステップで問題が発生した場合はユーザーに報告して判断を仰ぐ
- Quickモードの場合: Linearチケットは作成・更新しない
- ユーザーからplanの根幹に関わる提案・コメント（使用ツールの変更、アーキテクチャの変更、アプローチの変更など）があった場合は、即座に作業を中断し、planを修正してから再開する

## 運用ルール

### ステップ間の情報受け渡し
ステップ間の情報受け渡しは会話コンテキストではなくファイルを介して行う。
- 目的: 会話コンテキストの肥大化を防ぎ、後続ステップが必要な情報だけを選択的に読めるようにする
- 各ステップの出力を \`~/claude-code-data/workflows/{ID}/\` 配下にファイルとして書き出す
- 次のステップは会話履歴ではなくファイルから前ステップの結果を読み込む
- ファイル名規約: \`{skill名}-result.md\``,
});

export default devMentorSkill;
