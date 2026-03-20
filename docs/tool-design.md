# SkillSmith ツール設計

このドキュメントは、[reference.md](reference.md) に記載されたスキル設計パターン（人間がスキルを管理する方法）を、SkillSmith というGUIツールに落とし込む際に行った設計判断をまとめたものである。

## 前提: reference.md との関係

- **reference.md**: Claude Code のスキル/エージェント/プラグインを人間が手動で設計・管理するための規約とパターン集
- **本ドキュメント**: reference.md のパターンをツールで管理するにあたり、変換・簡略化・拡張した設計判断の記録

## データモデル概要

### テーブル構成

```
Plugin
  └── Component (type: SKILL / AGENT)
        ├── SkillConfig (1:1)  ... Skill固有フィールド
        ├── AgentConfig (1:1)  ... Agent固有フィールド
        ├── ComponentFile      ... ファイル群
        │     └── OutputSchemaField ... 出力スキーマのフィールド定義（OUTPUT_SCHEMAロールのみ）
        └── ComponentDependency ... 依存関係
```

| テーブル | 役割 |
|---------|------|
| Plugin | プラグイン全体のメタデータ |
| Component | Skill/Agentを依存関係グラフのノードとして統一管理 |
| SkillConfig | Skill固有の設定（フロントマター由来フィールドを含む） |
| AgentConfig | Agent固有の設定（フロントマター由来フィールドを含む） |
| ComponentFile | コンポーネントに紐づくファイル（SKILL.md, template.md 等） |
| OutputSchemaField | OUTPUT_SCHEMAロールのComponentFileに紐づく出力フィールド定義 |
| ComponentDependency | コンポーネント間の依存関係 |

## 設計判断

### 1. SkillとAgentをComponentテーブルで統一管理する

**reference.md での扱い**: SkillとAgentは明確に分離されている。Skillは手順・知識の定義（What）、Agentは実行環境・振る舞いの定義（How）。ファイル構造も別ディレクトリ（`skills/` と `agents/`）。

**ツール設計での判断**: 両者を共通の `Component` テーブルの行として管理する。

**理由**: ツール上では Skill→Skill、Skill→Agent、Agent→Skill という複数パターンの依存関係を統一的に管理する必要がある。依存元・依存先が異なるテーブルに分散すると外部キー設計が煩雑になる。Component を依存関係グラフのノードとすることで、`ComponentDependency` テーブルは source と target の2つの外部キーだけで全パターンを表現できる。

### 2. Componentは属性を持たず、依存グラフのノードに専念する

name や description は Skill にも Agent にもあるが、これは「たまたま両方にある」だけであり、共通の抽象ではない。Component に属性を持たせると STI（単一テーブル継承）的なテーブルになり、type によって使わないカラムが多数並ぶ。

Componentは `pluginId` と `type`（SKILL / AGENT）だけを持ち、固有の属性は SkillConfig / AgentConfig に1:1で委譲する。これにより関心の分離が明確になる。

### 3. スキルの分類を簡略化する

**reference.md での分類**:
- Entry-point skill（standalone / orchestrator の2種）
- Worker skill
- Cross-cutting skill

**ツール設計での判断**: SkillConfig.type は `ENTRY_POINT` / `WORKER` の2値。

**理由**:
- **Standalone と Orchestrator の統合**: 両者に実質的な違いはない。Orchestrator であるかどうかは ComponentDependency に子があるかで判別できる
- **Cross-cutting の除外**: Cross-cutting skill は Entry-point の一種として扱える（ユーザー呼び出しなし = `userInvocable: false` の Entry-point）。分類はあくまで人間が設計時に考えやすくするためのもので、DB上で区別する実益がない

### 4. Entry-point同士の呼び出しを許可する

**reference.md での制約**: 「Sub Agentは更にSub Agentを生成できない」ため、実質的に Entry-point が別の Entry-point を呼び出すことは想定されていない。

**ツール設計での判断**: この制約を緩和し、Entry-point 同士の依存を ComponentDependency で登録可能にする。

**理由**: 元の制約は人間が手動で依存関係を管理する前提での複雑さ回避策だった。SkillSmith で依存関係を可視化・管理できるようになれば、この制約は不要になる。ただし Claude Code ランタイムの制約（Sub Agent が Sub Agent を生成できない）は依然として存在するため、実行時にどう展開するかはアプリケーション側で考慮する必要がある。

### 5. Agent→Skillの依存をWORKERのみに制限する

ComponentDependency で Agent が依存できる Skill は、SkillConfig.type が `WORKER` のもののみとする（アプリ側バリデーション）。

**理由**: 単一責任原則の強制。Agent は専門タスクを担当する Worker skill をプリロードして実行する存在であり、Entry-point（ワークフロー全体を管理するスキル）をプリロードする意味がない。

### 6. 依存関係の統一管理とskillsフィールドの廃止

**reference.md での管理方法**:
- Agent の `skills:` フロントマターで、プリロードするスキルをリスト指定
- Orchestrator Skill の SKILL.md 内で、`Task(subagent_type: ...)` で呼ぶ Agent を記述

**ツール設計での判断**: 上記すべてを `ComponentDependency` テーブルで管理し、AgentConfig から `skills` フィールドを廃止する。

**理由**: 依存関係が JSON 配列（文字列）とドキュメント内の記述という2つの異なる形式で管理されていると、ツール上での可視化・バリデーション・整合性チェックが困難になる。正規化されたテーブルで統一管理することで、依存グラフの走査、循環検知、影響分析が容易になる。

### 7. ComponentDependencyにdependencyTypeを持たない

ComponentDependency には sourceId, targetId, order のみを持ち、依存の種類（Skill→Skill / Skill→Agent / Agent→Skill）を示す `dependencyType` フィールドは追加しない。

**理由**: 依存タイプは source と target それぞれの Component.type から導出可能な情報である。冗長に持つと、Component.type と dependencyType の間で不整合が発生するリスクがある。不整合回避を優先し、JOINで判別する方針とする。

### 8. context / agent フィールドの扱い

**reference.md での定義**: Skill フロントマターの `context: fork` と `agent` は、スキルをサブエージェントとして隔離実行するための Claude Code ネイティブ機能。

**ツール設計での判断**: SkillConfig にフィールドとして保持するが、SkillSmith の依存関係モデルには組み込まない。UI上では非推奨とし、初期状態では非表示/折りたたみにする。

**理由**:
- フロントマターの互換性のためにデータとしての保存・出力は必要
- しかし SkillSmith の依存関係管理（ComponentDependency）とは独立した仕組み
- SkillSmith では ComponentDependency による明示的な依存関係管理を推奨する
- `context: fork` + `agent` は Claude Code の仕組みに直接依存する設定であり、SkillSmith が抽象化・管理する対象ではない

### 9. ワークフロー出力スキーマの定義

**課題**: Worker skill がワークフローファイル（`~/.claude/workflows/{task-id}/`）に書き出す成果物（例: `implement-result.md`）のフォーマットは `template-result.md` で定義されているが、SkillSmith のデータモデル上でこの「出力スキーマ」をどう表現するかが未定義だった。

**検討した選択肢**:

| Option | 概要 | 判定 |
|--------|------|------|
| A | ComponentFileRole enum に `OUTPUT_SCHEMA` を追加し、`template-result.md` を OUTPUT_SCHEMA ロールとして管理する | **採用** |
| B | SkillConfig に `outputSchema` フィールド（JSON文字列）を追加し、出力スキーマをインラインで保持する | 棄却 |
| C | SkillConfig に `outputSchemaFileId` を追加し、ComponentFile への外部キーで参照する | 棄却 |
| D | 出力スキーマをデータモデルに含めず、template-result.md を TEMPLATE ロールのまま運用規約で区別する | 棄却 |

**Option A を採用した理由**:

- `template-result.md` は既存の ComponentFile の仕組み（ファイルとしての管理、バージョニング、コンテンツ保持）にそのまま載る。新規テーブルやフィールドの追加が不要で、enum 値の追加だけで対応できる
- TEMPLATE ロールは「スキルが出力するドキュメントのフォーマット」（例: `template.md`）を意味し、OUTPUT_SCHEMA は「ワークフローの後続ステップに渡す成果物のフォーマット」を意味する。意味的に異なるため、ロールを分けることで UI 上での表示・フィルタリングが容易になる
- 既存のバリデーションルール「Component.type=AGENT -> ComponentFile.role は MAIN のみ」と整合する（OUTPUT_SCHEMA は Skill のみに紐づく）

**Option B を棄却した理由**: 出力スキーマは Markdown テンプレートであり、構造化された JSON として表現するには不自然。また、SkillConfig に長いテキストフィールドを追加するとテーブルの責務が膨らむ。

**Option C を棄却した理由**: ComponentFile への外部キーを SkillConfig に持たせると、ComponentFile 側からの逆引きと合わせて循環的な参照構造になる。ComponentFile.role で十分に区別できる情報に対して、外部キーを追加する実益がない。

**Option D を棄却した理由**: TEMPLATE ロールと OUTPUT_SCHEMA の区別が運用規約に依存すると、ツール上でのバリデーションや自動分類ができない。SkillSmith がスキーマとして形式化するツールである以上、暗黙の規約ではなく明示的なデータモデルで区別すべき。

**ComponentFile.role の拡張判断**:

ComponentFileRole enum の拡張は、新しいロールが以下の条件を満たす場合に行う:
- 既存ロールとは意味的に異なる用途を持つ
- UI 上での表示・フィルタリングで区別する必要がある
- アプリケーション側のバリデーションで利用する

OUTPUT_SCHEMA はこれらすべてを満たす。TEMPLATE との違いは「誰が消費するか」にある。TEMPLATE はスキル自身の出力フォーマット（人間やLLMが読む最終成果物の形式）であるのに対し、OUTPUT_SCHEMA はワークフローの後続ステップが読む中間成果物の形式である。

**パス乖離について**:

reference.md では `~/.claude/workflows/{task-id}/` をワークフローファイルの保存先としているが、実際の dev-workflow プラグインでは `~/claude-code-data/workflows/{task-id}/` を使用している。この乖離は WAR-20 の対応範囲外であり、別チケットで統一を検討する。SkillSmith のデータモデルとしてはパスの規約に依存せず、ComponentFile のコンテンツとして出力テンプレートを管理するため、パスの統一はデータモデルに影響しない。

**dev-workflow プラグインのデータフロー対応例**:

```
implement skill
  ├── ComponentFile(role: MAIN)           -> SKILL.md
  ├── ComponentFile(role: OUTPUT_SCHEMA)  -> template-result.md
  └── 実行時: template-result.md の形式で ~/.claude/workflows/{id}/implement-result.md に書き出す

plan-implementation skill
  ├── ComponentFile(role: MAIN)           -> SKILL.md
  ├── ComponentFile(role: TEMPLATE)       -> template.md (計画書の出力フォーマット)
  └── 実行時: template.md の形式で ~/.claude/workflows/{id}/plan.md に書き出す
```

この例では、plan-implementation の `template.md` は TEMPLATE ロール（スキル自身の出力フォーマット）、implement の `template-result.md` は OUTPUT_SCHEMA ロール（後続ステップへの成果物フォーマット）として区別される。ただし、plan-implementation の `template.md` も後続ステップ（implement）に渡される中間成果物であるため、OUTPUT_SCHEMA として扱うべきかは議論の余地がある。初期運用では「明確にワークフロー受け渡し専用のテンプレート（`*-result.md` パターン）」を OUTPUT_SCHEMA とし、それ以外は TEMPLATE とする。

### 10. 出力スキーマフィールドの構造化管理

**課題**: OUTPUT_SCHEMA ロール（設計判断 9 で導入）は ComponentFile のロールラベルとしてのみ存在し、出力スキーマの内部構造（フィールド名、型、必須フラグ、ネスト関係など）がデータモデル上で管理されていなかった。template-result.md の Markdown テキストとして保持されるだけでは、UI 上でのフィールド単位の編集・バリデーション・可視化ができない。

**設計判断**: `OutputSchemaField` モデルを新規作成し、OUTPUT_SCHEMA ロールの ComponentFile に紐づける。

**階層構造の表現**: 自己参照リレーション（parentId）で表現する。トップレベルフィールドは parentId が null、ネストされたフィールドは親の id を参照する。例:

```
## セルフチェック結果      -> OutputSchemaField (parentId: null, fieldType: GROUP)
  - テスト: {PASS/FAIL}  -> OutputSchemaField (parentId: 上記のid, fieldType: ENUM)
  - 型チェック: {PASS/FAIL} -> OutputSchemaField (parentId: 上記のid, fieldType: ENUM)
```

**OutputFieldType enum の設計**:

| 値 | 意味 | 用途例 |
|----|------|--------|
| TEXT | 自由テキスト | `## 根本原因`, `## 判断根拠` |
| ENUM | 選択肢型 | `{十分 / 一部不足 / 大幅不足}`, `{PASS/FAIL}` |
| LIST | リスト型 | `## 補完した情報` の箇条書き |
| TABLE | テーブル型 | `## コミット一覧` の Markdown テーブル |
| GROUP | グループ型 | 子フィールドを持つが値自体は持たないセクション |

**enumValues の JSON 文字列格納**: ENUM 型の場合、選択肢を JSON 配列文字列として保持する（例: `["十分","一部不足","大幅不足"]`）。SQLite がネイティブ JSON 型を持たないため String として格納する。これは allowedTools, tools 等の既存フィールドと同じ方針（設計判断「SQLite + JSON フィールド」参照）。fieldType が ENUM でない場合、enumValues は null であるべき。このバリデーションはアプリケーション層で実装する。

**ComponentFile との関連**: OutputSchemaField は componentFileId で ComponentFile に直接紐づける。対象の ComponentFile.role が OUTPUT_SCHEMA であることはアプリケーション側のバリデーションで保証する（DB 制約では表現できない）。

**sortOrder の管理方針**: 同一親配下でのフィールド表示順序を sortOrder で管理する。ユニーク制約（`@@unique([componentFileId, parentId, sortOrder])`）は設けず、アプリケーション層で自動採番する。

理由:
1. parentId が nullable であり、SQLite では NULL を含む複合ユニーク制約の動作が標準 SQL と異なる
2. ユニーク制約があると、フィールドの順序入れ替え時に一時的な制約違反が発生し、全フィールドの sortOrder を一括更新する必要がある
3. ComponentFile.sortOrder や ComponentDependency.order にもユニーク制約は設けられておらず、既存パターンと一貫する

## バリデーションルール

以下はDBレベルではなくアプリケーション側で実装する制約:

| ルール | 対象 |
|-------|------|
| Component.type=SKILL → SkillConfig が必須 | Component作成時 |
| Component.type=AGENT → AgentConfig が必須 | Component作成時 |
| Component.type=AGENT → ComponentFile.role は MAIN のみ | ComponentFile作成時 |
| ComponentFile.role=OUTPUT_SCHEMA → Component.type は SKILL のみ | ComponentFile作成時 |
| Agent→Skill 依存 → target の SkillConfig.type が WORKER のみ | ComponentDependency作成時 |
| SkillConfig.name は小文字・数字・ハイフンのみ、最大64文字 | SkillConfig作成・更新時 |
| OutputSchemaField.componentFileId -> ComponentFile.role は OUTPUT_SCHEMA のみ | OutputSchemaField作成時 |
| OutputSchemaField.enumValues は fieldType が ENUM の場合のみ非null | OutputSchemaField作成・更新時 |
| ComponentDependency の sourceId + targetId は一意 | ComponentDependency作成時（@@unique制約でDB保証） |
| AgentTeam.orchestratorId -> Component.type は SKILL かつ SkillConfig.skillType は ENTRY_POINT | AgentTeam作成時 |
| AgentTeamMember.componentId -> Component.type は AGENT のみ | AgentTeamMember作成時 |

## 技術的な制約と対応

### SQLite + JSON フィールド

allowedTools, tools, disallowedTools, hooks などの構造化データは、SQLite がネイティブ JSON 型を持たないため String として格納する。アプリケーション層で JSON のシリアライズ/デシリアライズを行う。

### ComponentFile のロール

| ロール | 対応ファイル | 備考 |
|-------|------------|------|
| MAIN | SKILL.md / agent.md | 必須。Agent は MAIN のみ |
| TEMPLATE | template.md, templates/*.md | Skill のみ |
| REFERENCE | reference.md | Skill のみ |
| EXAMPLE | examples/*.md | Skill のみ |
| OUTPUT_SCHEMA | template-result.md | Skill のみ。ワークフロー成果物のフォーマット |

### 11. Agent Teams のモデリング

**課題**: reference.md で定義されている Agent Teams パターン（複数の Agent が互いに通信しながら並列作業するパターン）が、現スキーマで表現できなかった。

**設計判断**: `AgentTeam` テーブルと `AgentTeamMember` テーブルを新設し、Team のグルーピングを管理する。`ComponentDependency` は変更しない。

**検討した選択肢**:

| Option | 概要 | 判定 |
|--------|------|------|
| A | `ComponentDependency` に `isTeammate: Boolean` を追加 | 棄却 |
| B | `AgentTeam` + `AgentTeamMember` テーブル新設 | **採用** |
| C | `ComponentDependency` に nullable `agentTeamId` を追加 | 棄却 |

**Option A を棄却した理由**: 1つのオーケストレーターが複数の独立した Team を持つケースで、どの依存が同一 Team に属するかを区別できない。

**Option C を棄却した理由**: `ComponentDependency` は「依存関係」を表現するテーブルであり、「Team メンバーシップ」という異なる意味を同居させると責務が混在する。また、Team メンバーの一覧を得るために依存関係テーブルを経由する必要があり、直感的でない。

**Option B を採用した理由**:

- Team のグルーピングが明示的で、複数 Team を持つケースも自然に表現できる
- `ComponentDependency` に手を入れず、既存の依存関係モデルへの影響がない
- Team のメタデータ（name, description）を持てる

**モデリング範囲の限定**:

以下は意図的にスキーマ外としている:

- **Teammate 間の通信内容**: Team 内部のやり取りは要所によって変わるため、SKILL.md / agent.md の本文に自由記述で任せる。スキーマで制御せず柔軟性を確保する
- **ステップ概念**: オーケストレーターの「どのステップで Team を起動するか」は、非同期の会話によって処理が変わるため、下手にステップを記述しない方が良い。SKILL.md の本文で記述する

**スキーマ構造**:

```
AgentTeam
  ├── pluginId       -> Plugin
  ├── orchestratorId -> Component (SKILL, ENTRY_POINT)
  ├── name, description
  └── AgentTeamMember[]
        ├── componentId -> Component (AGENT)
        └── sortOrder
```

**バリデーションルール**（アプリケーション層で実装）:

| ルール | 対象 |
|-------|------|
| AgentTeam.orchestratorId -> Component.type は SKILL かつ SkillConfig.skillType は ENTRY_POINT | AgentTeam 作成時 |
| AgentTeamMember.componentId -> Component.type は AGENT のみ | AgentTeamMember 作成時 |
