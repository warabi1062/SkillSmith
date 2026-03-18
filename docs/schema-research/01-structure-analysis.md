# 現行スキル構造の分析

## 概要

SkillSmith が対象とする Claude Code プラグインの構造を分析し、スキーマ設計の基礎情報を整理する。分析対象は Plugin / Skill / Agent の3レベル。

## 1. Plugin レベル

### plugin.json

プラグインのメタデータを定義する最小限のJSONファイル。

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | string | Yes | プラグイン名 |
| `description` | string | Yes | プラグインの概要 |

### ディレクトリ構造

```
plugins/{plugin-name}/
├── .claude-plugin/
│   └── plugin.json           # プラグインメタデータ（必須）
├── skills/{skill-name}/
│   ├── SKILL.md              # メイン指示（必須）
│   ├── template.md           # 出力フォーマット（任意）
│   ├── reference.md          # 詳細リファレンス（任意）
│   ├── templates/            # 複数テンプレート（任意）
│   └── examples/             # 出力例（任意）
├── agents/
│   └── {name}-agent.md       # 単一ファイルで完結
└── docs/                     # ドキュメント（任意）
```

## 2. Skill レベル

### Frontmatter フィールド（全10種）

| フィールド | 必須 | 型 | 説明 |
|-----------|------|-----|------|
| `name` | No | string | スキル名。省略時はディレクトリ名。小文字・数字・ハイフンのみ（最大64文字） |
| `description` | 推奨 | string | スキルの説明。Claudeが自動発動の判断に使用 |
| `argument-hint` | No | string | オートコンプリート表示のヒント。例: `[issue-number]` |
| `disable-model-invocation` | No | boolean | `true`でClaudeの自動発動を禁止 |
| `user-invocable` | No | boolean | `false`で`/`メニューから非表示 |
| `allowed-tools` | No | string \| string[] | 許可確認なしで使えるツール。カンマ区切りまたはYAMLリスト |
| `context` | No | enum | `fork`でサブエージェントとして隔離実行 |
| `agent` | No | string | `context: fork`時のエージェントタイプ |
| `model` | No | string | スキル実行時のモデル指定 |
| `hooks` | No | object | スキルライフサイクルにフックするシェルコマンド |

### 3分類

| 種類 | 役割 | サブ分類 | 例 |
|------|------|---------|-----|
| Entry-point | ユーザーが `/skill-name` で呼び出す | 単体完結型 | `review-pr`, `lint-settings` |
| Entry-point | ユーザーが `/skill-name` で呼び出す | オーケストレーター型 | `dev`, `linear-manage` |
| Worker | オーケストレーターの1ステップを担当 | - | `implement`, `create-pr` |
| Cross-cutting | CLAUDE.mdからグローバル注入される横断的関心事 | - | `slack-notify`, `memory-manager` |

### サポートファイル

| ファイル | 必須 | 用途 |
|---------|------|------|
| SKILL.md | Yes | メイン指示 |
| template.md | No | 出力フォーマットのテンプレート |
| reference.md | No | 詳細リファレンス |
| templates/ | No | 複数テンプレートがある場合 |
| examples/ | No | 出力例 |

### Body 構造

SKILL.md の本文は以下のセクション構成を取る:

1. **入力セクション**: orchestrator から渡される情報の定義
2. **手順セクション**: 番号付きステップで処理を記述
3. **結果保存セクション**: `~/.claude/workflows/{task-id}/` へのファイル書き出し
4. **結果返却セクション**: 概要と保存先パスの返却

### 制約

- オーケストレーター型 Entry-point は Skill として作成する（Agent にしない）。Sub-agent は更に Sub-agent を生成できないため
- Worker skill は直接呼ばない。対応する Agent を経由して呼び出す

## 3. Agent レベル

### Frontmatter フィールド（全9種）

| フィールド | 必須 | 型 | 説明 |
|-----------|------|-----|------|
| `name` | Yes | string | エージェント名。`subagent_type` で指定する値 |
| `description` | Yes | string | エージェントの説明 |
| `model` | No | enum | `inherit`, `sonnet`, `haiku`, `opus` |
| `tools` | No | string[] | 使用可能なツールのリスト |
| `disallowedTools` | No | string[] | 拒否するツールのリスト |
| `skills` | No | string[] | プリロードするスキルのリスト |
| `permissionMode` | No | enum | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `hooks` | No | object | ライフサイクルフック |
| `memory` | No | enum | `user`, `project`, `local` |

### Body 構造

Agent の本文は以下の構成:

1. **サマリー**: 1文の概要
2. **入力**: orchestrator から渡される情報
3. **出力**: 返却する情報（任意）
4. **実行**: skill の手順への参照 + agent 固有の制約
5. **セキュリティ**: セキュア情報に関する注意事項

### 命名規約

- 末尾に `-agent` を付ける（例: `triage-agent`, `implement-agent`）
- 対応するスキルがある場合、スキル名と対になる名前にする

### 制約

- Sub-agent は更に Sub-agent を生成できない
- Skill の手順を Agent 本文に転記しない（`skills:` でプリロードする）
- Agent はサポートファイルを持たない（単一 .md ファイルで完結）

## 4. ファイル間の関係

### Skill-Agent 対応

Worker skill は必ず対応する Agent を持つ。Agent の `skills:` でスキルをプリロードし、手順・知識を自己取得する。

```
skills/implement/SKILL.md    <-- 手順・知識を定義（What）
agents/implement-agent.md    <-- skills: [implement] でプリロード（How）
```

### Orchestrator -> Agent 呼び出し

オーケストレーターは `Task(subagent_type: ...)` で Agent を呼び出す。Worker skill を直接呼ばない。

```
skills/dev/SKILL.md          <-- Task(subagent_type: implement-agent) で依頼
  -> agents/implement-agent.md
    -> skills/implement/SKILL.md（プリロード）
```

### Agent -> Skill プリロード

Agent の `skills:` フィールドにリストしたスキルの SKILL.md 全文がシステムプロンプトに注入される。

### ファイルパス中継パターン

1. 書き出す側の skill がファイルパスを決定し、保存後にそのパスを返す
2. オーケストレーターが返却されたパスを受け取り、次の agent に渡す
3. 読み込む側はオーケストレーターから渡されたパスを使う（自分でパスを構築しない）

## 5. スキーマ設計への示唆

### 型安全に表現すべき要素

- Plugin メタデータ（plugin.json）の構造
- Skill frontmatter の全10フィールド + 型制約
- Agent frontmatter の全9フィールド + 型制約
- Skill の3分類（Entry-point / Worker / Cross-cutting）の判別
- Entry-point のサブ分類（単体完結型 / オーケストレーター型）

### 構造化が難しい要素

- SKILL.md の Body 部分（自由記述の Markdown）
- Agent の Body 部分（同上）
- サポートファイル群の存在チェック

### 関係性の表現

- Worker skill と Agent の1:1対応
- オーケストレーターのステップ定義とAgent参照
- ステップ間のファイルパス中継
