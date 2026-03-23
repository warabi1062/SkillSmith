// sentry-investigate スキル: Sentryエラーの原因調査と対応方針判定

import { WorkerWithSubAgent } from "../../../../app/lib/types";

const sentryInvestigateSkill = new WorkerWithSubAgent({
  name: "sentry-investigate",
  description:
    "Sentryエラーの原因を調査し、対応方針を判定するスキル。ワークフローの一部として使用される。",
  allowedTools: [
    "Read",
    "Grep",
    "Glob",
    "Write",
    "Task",
    "ToolSearch",
    "mcp__plugin_sentry_sentry__get_issue_details",
    "mcp__plugin_sentry_sentry__search_issue_events",
    "mcp__plugin_sentry_sentry__analyze_issue_with_seer",
    "mcp__plugin_sentry_sentry__get_trace_details",
    "mcp__plugin_sentry_sentry__get_issue_tag_values",
  ],
  files: [
    { role: "TEMPLATE", filename: "template-result.md", sortOrder: 1 },
  ],
  agentConfig: {
    model: "sonnet",
    tools: ["Read", "Grep", "Glob", "Write", "ToolSearch"],
    content: `Sentryエラーの情報を取得・分析し、コードベースを横断的に調査して根本原因を特定するエージェント。
対応方針の判定（修正が必要か無視してよいか）を行い、結果をファイルに書き出す。

## 入力

- Sentry issue の識別子（URLまたはissue ID）

## 出力

- Sentry調査結果の保存先パス

## 実行

sentry-investigate skill の手順に従って実行する。

## セキュリティ

セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。`,
  },
  content: `# Sentry Investigate

Sentry issue のエラー情報を取得し、コードベースを調査して根本原因を特定する。

## 入力

Sentry issue の識別子が渡される:
- Sentry URL（例: \`https://sentry.io/organizations/xxx/issues/12345/\`）
- issue ID（例: \`JAVASCRIPT-2K9\`, \`12345\`）

## 手順

### 1. Sentry MCP ツールのロード

ToolSearch で Sentry MCP ツールをロードする。

### 2. エラー詳細の取得

\`get_issue_details\` でエラーの詳細情報を取得する:
- エラータイトル・メッセージ
- スタックトレース
- タグ情報

### 3. イベント履歴の確認

\`search_issue_events\` でイベント履歴を確認する:
- 発生頻度
- 影響ユーザー数
- 発生期間

### 4. AI 分析の実行

\`analyze_issue_with_seer\` で AI による分析を実行し、追加の洞察を得る。

### 5. コードベース調査

スタックトレースから関連コードを特定し、根本原因を調査する:
- Grep/Read で関連コードを特定
- web で起きたエラーでも原因が web にあるとは限らないため、横断的に調査する
- エラーが発生するコードパスを追跡

### 6. 対応方針の判定

調査結果をもとに対応方針を判定する:

- 対応が必要: 原因と修正方針の概要をまとめる
- 無視してよい: 理由と無視方法を提案する（Sentry ignore 設定、captureException 呼び出し箇所の特定など）

### 7. 結果の保存

調査結果を [template-result.md](template-result.md) のフォーマットで \`~/claude-code-data/workflows/{task-id}/sentry-investigation.md\` に書き出す。

\`{task-id}\` は \`sentry-{issue-id}\` の形式。issue ID は Sentry 上の短縮ID（例: \`JAVASCRIPT-2K9\`）を使用する。

### 8. 結果返却

調査結果の概要に加え、保存先パス（\`sentry-investigation.md\` のパス）を返す。

## セキュリティ

Sentry の内部URL、APIキー、個人情報は出力に含めないこと。`,
});

export default sentryInvestigateSkill;
