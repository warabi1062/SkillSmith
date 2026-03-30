// check-updates スキル: Claude Codeの最新リリース確認とプラグイン更新

import { WorkerSkill, tool } from "../../../../../../app/lib/types";

const checkUpdatesSkill = new WorkerSkill({
  name: "check-updates",
  description:
    "Claude Codeの最新リリースを確認し、作業ディレクトリ内のskills・agentsに必要な更新を適用する",
  userInvocable: true,
  allowedTools: [
    tool("Read"),
    tool("Write"),
    tool("Edit"),
    tool("Glob"),
    tool("Grep"),
    tool("Bash"),
    tool("WebFetch"),
    tool("WebSearch"),
  ],
  content: `# Check Updates

\`$ARGUMENTS\` に対して、Claude Codeの最新リリースを確認し、プラグインへの更新を適用する。

## 作業詳細

### Step 1: リリース情報の収集

\`作業リポジトリのルートにある README.md の「メンテナンス記録」テーブル\` を読み込み、前回チェック時点を確認する。ファイルが存在しない場合は初回実行とみなし、直近1ヶ月分のリリースを対象とする。

以下のソースから**前回チェック以降の全リリース**の更新情報を取得する:

- **GitHub Releases**: \`https://github.com/anthropics/claude-code/releases\` からWebFetchで前回チェック以降のリリースノートを全て取得（ページネーションがある場合は遡る）
- **Changelog**: \`https://docs.anthropic.com/en/docs/claude-code/changelog\` からWebFetchで前回以降の変更履歴を取得
- **公式ドキュメント**: \`https://docs.anthropic.com/en/docs/claude-code\` から機能一覧を確認

### Step 2: プラグイン設定の棚卸しと差分分析

作業ディレクトリ内の以下を読み込み、現在の構成を把握する:

- \`plugins/*/skills/*/SKILL.md\` の全ファイル
- \`plugins/*/skills/*/reference.md\` の全ファイル
- \`plugins/*/agents/*.md\` の全ファイル

各SKILL.mdについて、frontmatterフィールド・allowed-tools・使用機能（context, hooks, once等）を抽出する。

収集したリリース情報とプラグイン設定を照合し、以下を特定する:

- **新機能の活用機会**: 新しいツール・API・frontmatterフィールド、既存スキルで使える新機能、パフォーマンス改善に繋がる設定変更
- **非推奨・破壊的変更**: 廃止された機能を使用している箇所、変更が必要なAPI・設定
- **ベストプラクティスの更新**: 推奨パターンの変化、新しい設定オプション

### Step 3: 更新の適用

差分分析の結果に基づき、以下を適用する:

1. **lint-pluginルールの更新**: ベストプラクティスの変更を \`lint-plugin/SKILL.md\` に反映する（推奨フォーマットの追加、廃止フィールドの非推奨ルール追加等）
2. **lint-pluginの実行**: Skillツールで \`lint-plugin\` を呼び出し、全skills/agentsにフォーマットチェック・自動修正を実行する
3. **reference.mdの更新**: ドキュメントの更新が必要な場合に反映する

### Step 4: カーソル更新

\`作業リポジトリのルートにある README.md の「メンテナンス記録」テーブル\` を今回確認した最新バージョン・日付で更新する。

### Step 5: 結果報告

ユーザーに以下のフォーマットでレポートを報告する:

\`\`\`
## 確認したリリース
- {バージョン}: {概要}

## 適用した更新
- lint-pluginルール更新: {内容、なければ「なし」}
- lint実行結果: {サマリー}
- その他: {reference.md等の更新内容、なければ「なし」}

## 非推奨・破壊的変更
{該当なしの場合は「なし」}

## 変更不要と判断した項目
{確認したが変更不要と判断した項目}
\`\`\``,
});

export default checkUpdatesSkill;
