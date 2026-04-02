# プラグイン作成リファレンス

## 設計原則

### 作業の適切な移譲（Delegation）

複雑なワークフローを効率的に実行するため、作業を専門化されたコンポーネントに移譲する。

- **オーケストレーター**: 全体の流れを管理し、各ステップを順番に実行
- **ワーカー**: 専門的なタスクを担当し、結果を返す

### 単一責務の原則

各 skill/agent は1つの明確な責務を持つ。

- 「計画を立てる」と「計画をレビューする」は別の agent
- 「実装する」と「レビューする」は別の agent
- 視点の独立性を確保し、バイアスを防ぐ

### メインスレッド vs サブエージェント

- **メインスレッド**: ユーザーとの対話、ワークフローの制御
- **サブエージェント**: 隔離されたコンテキストで専門タスクを実行

## プラグイン構造

### ディレクトリ構造（全体像）

```
plugins/{plugin-name}/
├── .claude-plugin/
│   └── plugin.json        # プラグインメタデータ（必須）
├── skills/
│   └── {skill-name}/
│       ├── SKILL.md           # メイン指示（必須）
│       ├── template.md        # 出力フォーマットのテンプレート（任意）
│       ├── reference.md       # 詳細リファレンス（任意）
│       ├── templates/         # 複数テンプレートがある場合（任意）
│       │   ├── foo.md
│       │   └── bar.md
│       └── examples/          # 出力例（任意）
│           └── sample.md
├── agents/
│   ├── triage-agent.md
│   └── implement-agent.md
└── docs/                      # プラグインのドキュメント（任意）
    └── design.md
```

### plugin.json フォーマット

```json
{
  "name": "{plugin-name}",
  "description": "{プラグインの概要}"
}
```

## スキル作成

### スキルの種類

Skill は役割によって3つのパターンに分類される。

```
[CLAUDE.md]
    │ グローバルルールとして注入
    ↓
[Cross-cutting skill]  ──────────────────────────
    slack-notify, memory-manager        横断的に適用
─────────────────────────────────────────────────

[Entry-point skill]
    ユーザーが直接呼び出す
    ├── dev, linear-manage（オーケストレーター型）
    │     │
    │     ├── [Worker skill] implement
    │     ├── [Worker skill] create-pr
    │     └── ...
    └── review-pr, lint-settings, ...（単体完結型）
```

#### Entry-point skill

ユーザーが `/skill-name` で直接呼び出すスキル。単体で完結するものと、複数のAgentを呼び出すオーケストレーター型がある。

**単体完結型の例**: `review-pr`, `lint-settings`, `improvement`
**オーケストレーター型の例**: `dev`, `linear-manage`

**オーケストレーター型**:

複数の Agent を `Task(subagent_type: ...)` で順番に呼び出し、ワークフロー全体を制御するEntry-point skill。

特徴:
- 全体の流れを1箇所で把握できる
- 条件分岐やモード切り替えを管理
- 各ステップの入出力を明記
- cross-cutting skillの存在を知らなくてよい
- **Worker skill を直接呼ばず、必ず対応する Agent を経由する**

**オーケストレーター型は Skill として作ること（Agent にしない）**:
- オーケストレーターは `Task(subagent_type: ...)` で他の agent を呼び出す必要がある
- Agent（Subagent）は更に Subagent を生成できない（[公式ドキュメント: Sub-agents - Limitations](https://docs.anthropic.com/en/docs/claude-code/sub-agents#limitations)）
- Skill はメインコンテキストで実行されるため、Task ツールで自由に Subagent を呼べる
- `context: fork` + カスタム Agent の組み合わせも、fork 先が Subagent になるため同じ制約を受ける
- 唯一の例外は `claude --agent` でメインスレッドとして起動する場合だが、`/skill-name` での呼び出しとは別の使い方になる

#### Worker skill

Entry-point skill（主にオーケストレーター型）のステップとして呼ばれ、1つの作業単位を完結させる。

特徴:
- 入力と出力が明確
- 単体でも意味のある成果物を生む
- 自分がワークフローのどのステップかは知らない

**Worker skill に対応する Agent が必要かの判断**:
- Skill は手順・知識を定義し、Agent は `skills:` でそれをプリロードして実行する
- オーケストレーターは Agent を `Task(subagent_type: ...)` で呼び出す（Skill を直接呼ばない）
- これにより skill-agent の紐づけが Agent 側に凝集され、オーケストレーターは「誰に依頼するか」だけを管理する

**Agent が必要なケース**:
- コードベース調査やファイル編集など、自律的な判断を伴う作業
- 独立した視点を確保したい作業（レビューなど）
- SendMessage で反復サイクルを回す必要がある作業
- コンテキスト消費が大きく、メインスレッドから隔離したい作業

**Agent が不要なケース（Skill の手順をメインで直接実行すれば十分）**:
- Bash コマンドを数行実行するだけの定型処理
- 単純な API 呼び出しのみで判断が不要な処理

#### Cross-cutting skill

特定のEntry-point skillに属さず、CLAUDE.mdなどからグローバルに注入される横断的関心事。

特徴:
- 特定のワークフローに属さない
- CLAUDE.mdがいつ・どう使うかのルールを定義
- ユーザーやチームの環境に合わせて差し替え可能

**Agent が不要な cross-cutting skill**:
- メインスレッドで手順通りに実行すれば済む（例: slack-notify, memory-manager, retrospective）

**ルール**:
- **Entry-point skill（オーケストレーター型）**: Skillとして作成する（Agentにしない）。Subagentは更にSubagentを生成できないため
- **Worker skill**: 必ず対応するAgentを作成し、Agentの`skills:`でプリロードする。オーケストレーターはAgentを呼び出す（Skillを直接呼ばない）
- **Cross-cutting skill**: Entry-point skillから直接参照しない。CLAUDE.mdからグローバルに注入する

### Skill Frontmatter フィールド一覧

公式ドキュメント: https://code.claude.com/docs/en/skills#frontmatter-reference

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `name` | No | スキル名。省略時はディレクトリ名。小文字・数字・ハイフンのみ（最大64文字） |
| `description` | 推奨 | スキルの説明。Claudeが自動発動の判断に使う |
| `argument-hint` | No | オートコンプリートで表示されるヒント。例: `[issue-number]` |
| `disable-model-invocation` | No | `true`でClaudeの自動発動を禁止。副作用のあるスキル向き |
| `user-invocable` | No | `false`で`/`メニューから非表示。バックグラウンド知識向き |
| `allowed-tools` | No | スキル実行中に許可確認なしで使えるツール |
| `context` | No | `fork`でサブエージェントとして隔離実行 |
| `agent` | No | `context: fork`時のエージェントタイプ |
| `model` | No | スキル実行時のモデル指定 |
| `effort` | No | モデルの思考レベル。`low`/`medium`/`high`/`max`（`max`はOpus 4.6のみ） |
| `hooks` | No | スキルライフサイクルにフックするシェルコマンド |

### allowed-tools の記法

カンマ区切り（従来）とYAMLリスト形式の両方が使える:

```yaml
# カンマ区切り
allowed-tools: Read, Write, Grep, Glob

# YAMLリスト形式（複数行で見やすい）
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
```

### allowed-tools 選定ガイド

#### 読み取り専用系
調査・分析・レビュー系のスキル向き:
```
Read, Grep, Glob, Task
```

#### 読み書き系
ファイル生成・更新を行うスキル向き:
```
Read, Write, Grep, Glob
```
コード編集も行う場合は `Edit` を追加。

#### 外部コマンド系
git/GitHub操作を行うスキル向き:
```
Bash(git *)    # gitコマンドのみ
Bash(gh *)     # gh CLIのみ
Bash           # 制限なし（実装系スキルのみ）
```

#### 外部API系（MCP）
Linear:
```
mcp__plugin_linear_linear__get_issue
mcp__plugin_linear_linear__create_issue
mcp__plugin_linear_linear__update_issue
mcp__plugin_linear_linear__list_issues
```

Notion:
```
mcp__notion__notion-search
mcp__notion__notion-fetch
```

IDE:
```
mcp__ide__getDiagnostics
mcp__ide__executeCode
```

動的発見:
```
ToolSearch    # 未知のMCPツールを動的に発見する場合に追加
```

#### 組み合わせパターン例

| スキルの性質 | allowed-tools |
|------------|---------------|
| 調査・レビュー | Read, Grep, Glob, Task |
| レポート書き出し | Read, Write, Grep, Glob |
| コード実装 | Read, Write, Edit, Grep, Glob, Bash, Task, ToolSearch |
| PR操作 | Read, Grep, Glob, Bash(git *), Bash(gh *), Task |
| Linearチケット操作 | Read, Grep, Glob, Task, ToolSearch, Linear MCP系 |

### スキルのディレクトリ構造

```
plugins/{plugin-name}/skills/{name}/
├── SKILL.md           # メイン指示（必須）
├── template.md        # 出力フォーマットのテンプレート（任意）
├── reference.md       # 詳細リファレンス（任意）
├── templates/         # 複数テンプレートがある場合（任意）
│   ├── foo.md
│   └── bar.md
└── examples/          # 出力例（任意）
    └── sample.md
```

### SKILL.md からサポートファイルを参照する書き方

```markdown
出力は [template.md](template.md) のフォーマットに従う。
詳細は [reference.md](reference.md) を参照。
```

## エージェント作成

### 概要

サブエージェントはプラグインの `agents/{name}.md` に定義する。
Taskツールの `subagent_type` で指定して起動される。
メイン会話とは隔離されたコンテキストで実行される。

### Agent Frontmatter フィールド一覧

公式ドキュメント: https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `name` | Yes | エージェント名。Taskツールの`subagent_type`で指定する値 |
| `description` | Yes | エージェントの説明 |
| `model` | No | 使用モデル。`inherit`（親と同じ）, `sonnet`, `haiku`, `opus` |
| `tools` | No | 使用可能なツールのリスト |
| `disallowedTools` | No | 拒否するツールのリスト。`tools`やデフォルトから除外される |
| `skills` | No | プリロードするスキルのリスト。スキルの全文がシステムプロンプトに注入される |
| `permissionMode` | No | 権限モード。`default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `effort` | No | モデルの思考レベル。`low`/`medium`/`high`/`max`（`max`はOpus 4.6のみ） |
| `maxTurns` | No | エージェントの最大ターン数。無限ループ防止に有効 |
| `mcpServers` | No | エージェントにスコープされたMCPサーバー。名前参照またはインライン定義 |
| `hooks` | No | エージェントのライフサイクルにフックするコマンド |
| `memory` | No | 永続メモリのスコープ。`user`, `project`, `local`。セッション跨ぎの学習を可能にする |
| `background` | No | `true`で常にバックグラウンドタスクとして実行。デフォルト: `false` |
| `isolation` | No | `worktree`で一時的なgit worktreeで隔離実行。変更がなければ自動クリーンアップ |

### tools 選定ガイド

#### 読み取り専用エージェント
調査・レビュー・計画系:
```yaml
tools:
  - Read
  - Grep
  - Glob
```

#### 読み書きエージェント
ファイル生成・レポート出力系:
```yaml
tools:
  - Read
  - Write
  - Grep
  - Glob
```

#### 実装エージェント
コード実装・テスト実行系:
```yaml
tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Task
```

#### 外部API系
Bash制限付き + MCP利用時はToolSearchも追加:
```yaml
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - ToolSearch
```

### skills の使い方

`skills` にリストしたスキルのSKILL.md全文がエージェントのシステムプロンプトに注入される。
エージェントが常に参照すべき手順や規約をスキルとして渡す。

```yaml
skills:
  - implement       # 実装手順
  - memory-manager  # 記憶管理の規約
```

### 既存エージェントのパターン表

| エージェント | 用途 | model | tools | skills |
|------------|------|-------|-------|--------|
| triage-agent | チケット情報精査 | sonnet | (なし・スキル経由) | linear-triage |
| split-agent | チケット分割判断 | sonnet | (なし・スキル経由) | linear-split |
| bug-reproduction-agent | バグ再現確認 | inherit | Read,Bash,Write,Glob,AskUserQuestion | capture-bug-reproduction |
| plan-agent | 実装計画作成 | inherit | Read,Grep,Glob,Write,Task,ToolSearch | plan-implementation |
| implement-agent | コード実装 | inherit | Read,Write,Edit,Grep,Glob,Bash,Task | implement |
| plan-review-agent | 実装計画レビュー | inherit | Read,Grep,Glob | (なし) |
| review-agent | コードレビュー | inherit | Read,Grep,Glob,Bash | (なし) |
| capture-before-after-agent | 視覚的検証 | inherit | Read,Bash,Write,AskUserQuestion | capture-before-after |
| create-pr-agent | PR作成 | sonnet | Read,Grep,Glob,Bash,ToolSearch | create-pr |

### 命名規約

- 末尾に `-agent` を付ける（例: `triage-agent`, `implement-agent`）
- 対応するスキルがある場合、スキル名と対になる名前にする（例: `implement` skill → `implement-agent`）

### Worker skill との対応

**Worker skill には必ず対応する Agent を作成する。** Agent の `skills:` で対応するスキルをプリロードし、手順・知識を自己取得する構成にする。Entry-point skill（オーケストレーター型）は Agent を `Task(subagent_type: ...)` で呼び出し、Worker skill を直接呼ばない。

```
plugins/{plugin}/skills/implement/SKILL.md    ← 手順・知識を定義
plugins/{plugin}/agents/implement-agent.md    ← skills: [implement] でプリロード
plugins/{plugin}/skills/dev/SKILL.md          ← Task(subagent_type: implement-agent) で依頼するだけ
```

### Agent 本文の構成テンプレート

**skillがある場合は手順を書かず、agent固有の制約のみ書く。** Skill = 手順の定義（What）、Agent = 実行環境・振る舞いの定義（How）に役割を分離する。

```markdown
---
(frontmatter)
---

{1文のサマリー}

## 入力

- {orchestratorから渡される情報}

## 実行

{skill名} skill の手順に従って実行する。

- {agent固有の制約・振る舞いのみ箇条書き}

## セキュリティ

セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。
```

skillの手順をagent本文に転記すると、変更時に2箇所修正が必要になる。手順はskillに任せ、agentにはskillにない固有の制約だけを書く。

### Agent 設計指針

#### 異なる視点の確保

レビュー系 agent は「経緯を知らない第三者」として振る舞う。実装者のバイアスを排除し、見落としの発見やコードの可読性の客観的評価を可能にする。

#### SendMessage による反復

レビュー → 修正 → 再レビューのサイクルを `SendMessage` で実現する。初回呼び出しで返される `agent_id` を使い、修正依頼時に `SendMessage({to: agentId})` で前回のコンテキストを保持したまま継続する。

### セキュリティ注意事項

エージェント定義の末尾に以下の注意事項を含める:
```
セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。
```

エージェントはスキルと異なりサポートファイルを持たない。単一のmarkdownファイルで完結する。

```
plugins/{plugin-name}/agents/
├── triage-agent.md
├── implement-agent.md
├── plan-review-agent.md
└── review-agent.md
```

## 共通パターン

### Agent間の情報受け渡し（ワークフローファイル経由）

ワークフロー内で他のスキル/エージェントと連携する場合、会話コンテキストではなくワークフローファイル（`~/claude-code-data/workflows/{task-id}/`）を介して情報を受け渡す。これにより会話コンテキストの圧迫を防ぎ、後続ステップが必要な情報だけを選択的に読めるようにする。情報がファイルとして残るため再現性・デバッグ容易性も高まる。

#### オーケストレーターによるファイルパス中継

ファイルパスの受け渡しはオーケストレーターが中継する。各 skill/agent が他の skill/agent の出力ファイル名を暗黙的に知っている状態にしない。

原則:
- 書き出す側の skill がファイルパスを決定し、保存後にそのファイルパスを返す
- オーケストレーターが返却されたファイルパスを受け取り、次の agent に渡す
- 読み込む側の skill/agent は、オーケストレーターから渡されたファイルパスを使う（自分でパスを構築しない）
- オーケストレーターと agent ではファイル名を直接書かず、セマンティックな名前で参照する（例: `plan.md のパス` ではなく `実装計画のファイルパス`）

NG（暗黙的な依存）:
```
# orchestrator
渡す情報:
- チケットID                    ← IDだけ渡す

# skill（読み込む側）
~/claude-code-data/workflows/{ID}/plan.md を読み込む  ← 自分でパスを構築している
```

OK（明示的な中継）:
```
# skill（書き出す側）の結果返却
保存先ファイルパス（実装計画のファイルパス）を返す

# orchestrator
渡す情報:
- チケットID
- 実装計画のファイルパス（Step 2a で取得）  ← セマンティック名で中継

# skill（読み込む側）
入力として渡された実装計画のファイルパスを読み込む
```

#### 前ステップの結果を読む場合
SKILL.mdの「入力」セクションに、オーケストレーターから渡されるファイルパスを記載する。手順内ではそのファイルパスを使って読み込む:
```markdown
## 入力
- チケットID
- 実装計画のファイルパス（orchestratorから渡される）

### 1. 実装計画の読み込み
入力として渡された実装計画のファイルパスを読み込み、実装ステップを把握する。
```

#### 結果を後続ステップに渡す場合
1. `template-result.md` をサポートファイルとして作成し、出力フォーマットを定義する
2. SKILL.mdの手順の末尾に「結果の保存」と「結果返却」ステップを追加する:
```markdown
### N. 結果の保存
結果を `~/claude-code-data/workflows/{チケットID}/{skill名}-result.md` に [template-result.md](template-result.md) 形式で書き出す。

### N+1. 結果返却
結果の概要と保存先パスを返す。
```

#### ファイル名の規約
- `{skill名}-result.md`（例: `triage-result.md`, `split-result.md`, `implement-result.md`）
- `plan.md` は既存の慣習をそのまま使う

#### ファイル名の所有権
- ファイル名を決めるのは書き出す側の skill のみ。1箇所で定義する
- オーケストレーター・agent・読み込む側の skill はファイル名を知らない
- これにより、ファイル名を変更しても書き出す側の skill だけ修正すれば済む

### スキル固有の永続データ（~/claude-code-data/state/）

スキルが実行間で保持する必要がある状態（前回実行日時、カーソル位置など）は `~/claude-code-data/state/` に保存する。

```
~/claude-code-data/state/{skill-name}/
├── cursor.md          # 前回実行時点の情報
└── ...
```

**3層記憶（`~/claude-code-data/memory/`）との使い分け**:

| 保存先 | 用途 | 管理者 |
|--------|------|--------|
| `~/claude-code-data/memory/` | 作業コンテキスト（短期・中期・長期） | memory-manager skill |
| `~/claude-code-data/workflows/` | ワークフローのステップ間データ | 各スキル自身 |
| `~/claude-code-data/state/` | スキル固有の永続状態 | 各スキル自身 |

- `memory/` にワークフローデータやスキル固有の状態を保存しない
- `workflows/` と `state/` のデータは memory-manager の管理対象外

### プラグイン永続データ（${CLAUDE_PLUGIN_DATA}）

v2.1.78 で `${CLAUDE_PLUGIN_DATA}` 変数が追加された。プラグインの更新後も生き残る永続データディレクトリを参照できる。スキル固有の `~/claude-code-data/state/` とは別に、プラグインレベルで永続化が必要なデータに使用する。

### 承認ポイントの設計

| ポイント | 目的 | 省略可否 |
|---------|------|---------|
| 計画承認 | ユーザーが方向性を確認 | 設計判断が大きい場合は必須 |
| レビューサイクル | 品質確保 | 最大3回で打ち切り |
| 分割確認 | サブチケットの優先度確認 | 分割が発生した場合のみ |

基本方針: 最終的にPRでレビューするため、中間の確認は省略可。

### 文字列置換（$ARGUMENTS 等）

- `$ARGUMENTS`: 引数全体
- `$ARGUMENTS[0]`, `$0`: 第1引数
- `$ARGUMENTS[1]`, `$1`: 第2引数
- `${CLAUDE_SESSION_ID}`: 現在のセッションID
- SKILL.md内に`$ARGUMENTS`がない場合、末尾に`ARGUMENTS: <値>`が自動付加される

## アンチパターン

### 会話コンテキストへの全出力積み上げ

**問題**: agent の全出力をメインスレッドに返すと、コンテキストが肥大化

**対策**: ワークフローファイルを介して必要な情報だけを選択的に共有

### 1つの agent に複数の責務を持たせる

**問題**: 「実装もレビューもする」agent は視点が偏る

**対策**: `implement-agent` / `review-agent` のように分離し、「経緯を知らない第三者」の視点を確保

### 反復サイクルの上限なし

**問題**: レビュー → 修正の無限ループでスタック

**対策**: 最大3回で打ち切り、ユーザーに判断を仰ぐ

### オーケストレーター型Entry-pointとワーカーの混在

**問題**: dev スキルが直接コード実装すると責務が曖昧に

**対策**: dev は「何をどの順で実行するか」だけを管理、実際の作業は agent に委譲

### 暗黙の依存関係

問題: 「前のステップで〇〇が出力されているはず」という暗黙の前提。特に、読み込む側の skill/agent が他の skill の出力ファイル名をハードコードで知っている状態。ファイル名が2箇所以上に存在すると、変更時に不整合が生じる。

対策:
- ファイルパスはオーケストレーターが中継する。読み込む側はファイル名を知らず、入力として受け取ったファイルパスを使う
- オーケストレーターと agent ではファイル名ではなくセマンティック名で参照する（例: `実装計画のファイルパス`）
- ファイル名を定義するのは書き出す側の skill だけ

### 個別 skill がワークフロー全体を知る

**問題**: 「Step 5で使うから〜」のように、個別 skill がワークフローの他ステップを参照

**対策**: worker skill は自分の責務に集中し、「なぜ」ではなく「何を」だけを記述。ワークフローの知識はオーケストレーターに集約

### Cross-cutting skillをEntry-point skillに埋め込む

**問題**: 通知や記憶管理などの横断的関心事をEntry-point skillのステップとして明示的に呼び出す

**対策**: cross-cutting skillはCLAUDE.mdからグローバルに注入する。Entry-point skillは「何を報告するか」だけ定義し、「どう届けるか」は関与しない

## 設計チェックリスト

新しいワークフローを作成する際のチェックリスト:

- [ ] Entry-point / Worker / Cross-cutting の分類を意識する
- [ ] オーケストレーター型Entry-pointと専門エージェントの分離
- [ ] 各ステップの入出力ファイルの明確化（ファイル名は書き出す側の skill だけが知り、オーケストレーターはセマンティック名で中継する）
- [ ] レビュー系 agent は「経緯を知らない視点」で設計
- [ ] 反復サイクルの上限設定（3回など）
- [ ] 承認ポイントの適切な配置
- [ ] 横断的関心事（通知、記憶管理、振り返り等）はCross-cutting skillとしてCLAUDE.mdに委ねる
