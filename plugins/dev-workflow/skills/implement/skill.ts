// implement スキル: 承認済み実装計画に基づくコード実装

import { WorkerWithSubAgent } from "../../../../app/lib/types";

const implementSkill = new WorkerWithSubAgent({
  name: "implement",
  description:
    "承認済みの実装計画に基づいてコード実装を行うスキル。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Write",
    "Edit",
    "Grep",
    "Glob",
    "Bash",
    "Task",
    "ToolSearch",
    "mcp__ide__getDiagnostics",
    "mcp__ide__executeCode",
  ],
  files: [
    { role: "TEMPLATE", filename: "template-result.md", sortOrder: 1 },
  ],
  agentConfig: {
    model: "inherit",
    tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "ToolSearch"],
    content: `承認済みの実装計画に従ってコードを実装するエージェント。

## 入力

- チケットID
- 実装計画のパス（orchestrator から渡される）

## 出力

- 実装結果の保存先パス

## 実行

implement skill の手順に従って実行する。

- 計画に記載されたスコープ・パターンに従う
- 計画にない変更が必要な場合はその理由を記録する

## セキュリティ

セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。`,
  },
  content: `# Implement

承認済みの実装計画に従ってコードを実装する。

## 入力

- チケットID（例: \`LIN-123\`）
- plan.md のパス（orchestrator から渡される）

## 手順

### 1. 実装計画の読み込み

入力として渡された plan.md のパスを読み込み、実装ステップ・変更ファイル・テスト計画を把握する。

### 2. 実装

計画のコミット計画に従い、コミット単位で実装を進める。
1つのコミットの実装が完了したらコミットし、次のコミットに進む。

#### テスト
- 3A形式（Arrange / Act / Assert）で記述
- Red-Green-Refactorサイクルで進める:
  1. 失敗するテストを書く
  2. テストが通る最小限の実装をする
  3. リファクタリングする

#### コード品質
- 計画に記載された既存パターンに従う
- 不要な変更を加えない（計画のスコープに限定）
- TypeScriptの場合はLSPで型エラーがないことを確認

### 3. セルフチェック

実装完了後、自身で以下を確認する:
- 計画通りに実装できたか
- 計画にない変更が発生した場合、その理由を記録
- テストがすべてpassするか
- 明らかなコード品質の問題がないか

問題があれば修正してから完了とする。

### 3.5 スクリーンショット取得（Webアプリの場合）

Webアプリの変更が含まれる場合、スクリーンショットを取得して記録する。

#### Webアプリ判定

以下のいずれかに該当する場合、Webアプリ変更と判定する:
- 変更ファイルに \`.tsx\`, \`.jsx\`, \`.vue\`, \`.svelte\`, \`.html\`, \`.css\`, \`.scss\` が含まれる
- plan.mdに「UI」「画面」「フロントエンド」「Web」等のキーワードがある

#### スキルの解決

プロジェクトの \`.claude/skills/\` にスクリーンショット関連スキル（\`*screenshot*\`, \`*browser*\` 等）があるか確認し、あればそのスキルを使用する。なければこのステップはスキップする。

#### 実行

解決したスキルに従ってスクリーンショットを取得する。

\`\`\`
入力:
- タスクID: {チケットID}
- 対象URL: plan.mdの「確認対象URL」セクションがあればそのURL、なければデフォルト
- プロジェクトパス: 対象プロジェクトのルートディレクトリ
\`\`\`

スクリーンショットは \`~/claude-code-data/workflows/{チケットID}/screenshots/\` に保存される。

### 4. 結果の保存

\`~/claude-code-data/workflows/{チケットID}/implement-result.md\` に [template-result.md](template-result.md) 形式で結果を書き出す。

### 5. 結果返却

実装結果の概要に加え、implement-result.md の保存先パスを返す。`,
});

export default implementSkill;
