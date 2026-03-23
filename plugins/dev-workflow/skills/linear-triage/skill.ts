// linear-triage スキル: Linearチケットの調査・情報補完・スコープ分析・計画作成

import { WorkerWithSubAgent } from "../../../../app/lib/types";

const linearTriageSkill = new WorkerWithSubAgent({
  name: "linear-triage",
  description:
    "Linearチケットの内容を調査し、情報補完・スコープ分析を行って更新・分割の計画を立てるスキル。チケットの変更は実行せず計画のみ作成する。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Grep",
    "Glob",
    "Task",
    "ToolSearch",
    "mcp__plugin_linear_linear__get_issue",
    "mcp__plugin_linear_linear__list_issues",
    "mcp__notion__notion-search",
    "mcp__notion__notion-fetch",
  ],
  files: [
    { role: "TEMPLATE", filename: "template-result.md", sortOrder: 1 },
  ],
  agentConfig: {
    model: "sonnet",
    tools: ["Read", "Grep", "Glob", "Write", "ToolSearch"],
    content: `Linearチケットの情報を調査・分析し、更新・分割の計画を作成するエージェント。
チケットの変更は実行せず、計画の作成のみ行う。

## 入力

- チケットID

## 出力

- triage計画の保存先パス

## 実行

linear-triage skill の手順に従って実行する。

## セキュリティ

セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。`,
  },
  content: `# Linear Triage

Linearチケットの内容を調査・分析し、更新・分割の計画を作成する。
チケットの更新や分割は実行しない。計画の作成のみ行う。

## 入力

チケットID（例: \`LIN-123\`）がコンテキストとして渡される。

## 手順

### 1. チケット取得

Linear MCPの \`get_issue\` でチケットのtitle, description, labels, priority, assigneeを取得する。

### 2. 情報の充足度チェック

以下の観点でチケット内容を評価する:

- 目的・背景: なぜこの変更が必要か明記されているか
- 受入条件: 完了の定義が明確か（具体的な振る舞いの記述があるか）
- 技術的コンテキスト: 対象のコンポーネント・ファイル・APIなどが特定できるか
- 影響範囲: 他機能への影響が考慮されているか

充足度を「十分」「一部不足」「大幅不足」で判定する。

### 3. 情報補完（不足がある場合）

不足情報に応じて以下のソースから情報を収集する:

#### Slack
- チケットに関連するキーワード（タイトル、機能名）でSlack MCPを使い検索
- 関連する議論・決定事項を抽出

#### Notion
- 仕様書・設計ドキュメントをNotion MCPで検索
- 技術仕様・画面仕様などの詳細を取得

### 4. スコープ分析

チケットのdescription・受入条件から実装スコープを分析する。以下を評価:

- 変更が必要なファイル数の見積もり
- 機能の独立性（複数の独立した機能変更が含まれるか）
- DB変更・API変更・UI変更など異なるレイヤーの変更が混在するか

以下のいずれかに該当する場合、分割が必要と判断する:

- 独立した複数の機能変更が含まれる
- 異なるレイヤー（DB/API/UI）の大きな変更が混在する
- 受入条件が5つ以上あり、それぞれ独立している
- 実装が段階的に進められる（例: バックエンド → フロントエンド）

### 5. 計画の作成

\`~/claude-code-data/workflows/{チケットID}/triage-plan.md\` に [template-result.md](template-result.md) 形式で計画を書き出す。

内容:
- チケット更新内容（提案するdescription全文）
- 分割計画（分割する場合: 各サブチケットのtitle, description, 依存関係）
- 判断根拠

#### descriptionの構造ルール

チケットのdescriptionは \`---\`（divider）で「全員向け」と「開発者向け」に区分けする。

- dividerより上: 目的・背景、要件、受入条件、再現手順など、チームの誰もが理解すべき情報
- dividerより下: 技術メモ（対象コンポーネント・ファイル・API・実装方針など）、影響範囲

コードに関する記述やファイルパス、技術的な実装詳細はdividerより下に配置する。既存のdescriptionにdividerがない場合は適切な位置にdividerを挿入して整理する。分割で作成するサブチケットのdescriptionにも同じルールを適用する。

### 6. 結果返却

計画の概要を返す:
- チケットの充足度判定結果
- 補完した情報の概要
- 分割の要否
- triage-plan.md の保存先パス`,
});

export default linearTriageSkill;
