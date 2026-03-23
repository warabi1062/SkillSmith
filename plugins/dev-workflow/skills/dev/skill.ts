// dev スキル: Linearチケットまたはユーザー指示から実装計画・実装・PR作成を自動で行う

import { EntryPointSkill } from "../../../../app/lib/types";

const devSkill = new EntryPointSkill({
  name: "dev",
  description:
    "Linearチケットまたはユーザー指示から実装計画・実装・PR作成を自動で行う",
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
  dependencies: [
    "linear-triage",
    "linear-triage-review",
    "linear-triage-execute",
    "sentry-investigate",
    "plan-implementation",
    "implement",
    "create-pr",
  ],
  content: `# Dev

\`$ARGUMENTS\` に対して、以下のワークフローを順番に実行する。

## 入力判定

以下の順序で判定する:

1. Sentry URLを含む（\`sentry\` を含むURLパターン）→ Sentryモード
2. \`sentry:\` プレフィックス（例: \`sentry:JAVASCRIPT-2K9\`, \`sentry:12345\`）→ Sentryモード
3. Linear URLを含む（\`linear.app\` を含むURLパターン）→ Linearモード
4. \`^[A-Z]+-\\d+$\` にマッチ（例: LIN-123, PROJ-456）→ Linearモード
5. それ以外 → Quickモード

\`\`\`
[入力判定]
    ├── Sentryモード ──→ [Sentry調査] → [ユーザー判定]
    │                         ├── 対応する → [タスクID生成] → 共通ステップ
    │                         └── 無視する → 報告して終了
    ├── Linearモード ──→ [Triage] → [Triage Review] → [ユーザー承認] → [Triage Execute] → [ID確定]
    │
    └── Quickモード ──→ [タスクID生成]
            │
            ↓
    [ブランチ作成]
            ↓
    [Plan & Plan Review]
            ↓
    [Implement & Review]
            ↓
    [Create PR]
\`\`\`

---

## Sentryモード専用ステップ

### Step S1: Sentry調査

Taskツールを subagent_type: sentry-investigate-agent で呼び出し、エラー調査を委譲する。

渡す情報:
- Sentry issue の識別子（URLまたは \`sentry:\` プレフィックス以降の文字列）

出力（agent の返却値から取得）:
- Sentry調査結果のパス

### Step S2: ユーザー判定

調査結果をユーザーに提示し、対応方針を確認する:

- 対応する → タスクID \`sentry-{issue-id}\` を生成し、共通ステップ（Step 1: ブランチ作成）へ進む
- 無視する → 調査結果の「無視方法」を報告して終了

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

以下のステップは全モードで共通。\`{ID}\` はLinearモードではチケットID、Quickモードではタスクid、Sentryモードでは \`sentry-{issue-id}\` を指す。

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
例（Sentry）: feature/sentry-JAVASCRIPT-2K9-fix-null-reference
\`\`\`

- ベースブランチの最新を取得
- 新しいブランチを作成して切り替え
- 判定したベースブランチ名は \`~/claude-code-data/workflows/{ID}/base-branch.txt\` に保存し、そのパスを記録して後続のステップに渡す

### Step 2: Plan & Plan Review（実装計画・レビューサイクル）

#### 2a: Plan

Taskツールを subagent_type: plan-agent で呼び出し、計画作成を委譲する。

渡す情報:
- Linearモードの場合: チケットID + triage結果のパス（Step L4 で取得）
- Sentryモードの場合: タスクID（\`sentry-{issue-id}\`）+ Sentry調査結果のパス（Step S1 で取得）
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

### Step 3: Implement & Review（実装・レビューサイクル）

実装とレビューを繰り返し、コード品質を高める。

#### 3a: Implement

Taskツールを subagent_type: implement-agent で呼び出し、実装を委譲する。

渡す情報:
- チケットID
- 実装計画のパス（Step 2a で取得）

出力（agent の返却値から取得）:
- 実装結果のパス
- implement-agent の agent_id

#### 3b: Review

Taskツールを subagent_type: review-agent で呼び出し、レビューを委譲する。

渡す情報:
- チケットID
- 実装計画のパス（Step 2a で取得）

出力:
- レビュー結果（PASS / NEEDS_REVISION）
- review-agent の agent_id

#### 3c: 修正（NEEDS_REVISIONの場合）

review-agent の指摘を、Step 3a で取得した implement-agent の agent_id に対して SendMessage(to: agent_id) で渡し修正させる。
修正後、Step 3b で取得した review-agent の agent_id に対して SendMessage(to: agent_id) で再レビューする。
（SendMessage はメインスレッドから直接呼ぶこと。Agentツールで委譲しない）

このサイクルは最大3回まで繰り返す。3回で解決しない場合はユーザーに報告して判断を仰ぐ。

### Step 4: Create PR（PR作成）

Taskツールを subagent_type: create-pr-agent で呼び出し、PR作成を委譲する。

渡す情報:
- チケットID
- モード（Linear / Quick）
- 実装計画のパス（Step 2a で取得）
- 実装結果のパス（Step 3a で取得）
- ベースブランチ情報のパス（Step 1 で記録）

PR作成後に追加の修正・pushが発生した場合は、create-pr-agent の agent_id に対して SendMessage(to: agent_id) で呼び出す。

## 確認のスキップ

最終的にユーザーはPRでレビューするため、基本的には確認を省略してそのまま次のステップに進んでよい。設計判断の幅が大きく方向性の確認が重要なケースでは確認を取る。判断に迷う場合はスキップして進める。

## 注意事項

- 各ステップで問題が発生した場合はユーザーに報告して判断を仰ぐ
- Quickモードの場合: Linearチケットは作成・更新しない
- Sentryモードの場合: Linearチケットは作成・更新しない。「無視する」選択時は共通ステップに進まず終了する
- ユーザーからplanの根幹に関わる提案・コメント（使用ツールの変更、アーキテクチャの変更、アプローチの変更など）があった場合は、即座に作業を中断し、planを修正してから再開する。実装を進めてから後で修正するのではなく、plan段階に戻る

## 運用ルール

### ステップ間の情報受け渡し
ステップ間の情報受け渡しは会話コンテキストではなくファイルを介して行う。
- 目的: 会話コンテキストの肥大化を防ぎ、後続ステップが必要な情報だけを選択的に読めるようにする
- 各ステップの出力を \`~/claude-code-data/workflows/{task-id}/\` 配下にファイルとして書き出す
- 次のステップは会話履歴ではなくファイルから前ステップの結果を読み込む
- ファイル名規約: \`{skill名}-result.md\`
- 結果テンプレートは各スキルの \`template-result.md\` に定義する

## 複数リポジトリにまたがる変更の場合

スキーマ定義→利用側のように、複数リポジトリにまたがる変更が必要な場合は以下の手順に従う。

### ブランチ作成

各リポジトリでベースブランチの判定（develop優先）を行ったうえで同名のfeatureブランチを作成する:

\`\`\`bash
# 依存される側（スキーマ定義等）
cd /path/to/upstream-repo
git checkout {ベースブランチ} && git pull
git checkout -b feature/{ID}-{slug}

# 依存する側（利用側）
cd /path/to/downstream-repo
git checkout {ベースブランチ} && git pull
git checkout -b feature/{ID}-{slug}
\`\`\`

### 実装順序

依存関係に従って実装する。典型的なパターン:

1. 依存される側（スキーマ/API定義等）を先に実装
2. 生成ファイルがある場合は再生成
3. 依存する側に生成ファイルをコピーして実装

### PR作成

各リポジトリで個別にcreate-pr-agentを呼び出す。その際、相互参照と依存関係（どちらを先にmergeすべきか）を渡す。`,
});

export default devSkill;
