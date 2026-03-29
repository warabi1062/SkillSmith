# Lint Rules

このファイルは check-updates および review-lint-rules によって更新される。

## ルール一覧

### 1. リスト型フィールドの記法（allowed-tools / tools / disallowedTools）

**自動修正**: ✅

YAMLリスト形式が推奨。カンマ区切りは非推奨。

対象フィールド:
- `allowed-tools`（SKILL.md）
- `tools`（agent定義）
- `disallowedTools`（agent定義）

```yaml
# ✅ 推奨
allowed-tools:
  - Read
  - Write

# ❌ 非推奨
allowed-tools: Read, Write
```

**修正方法**: カンマ区切りをYAMLリスト形式に変換

---

### 2. skills の記法

**自動修正**: ✅

frontmatterの `skills:` フィールドもYAMLリスト形式が推奨。

```yaml
# ✅ 推奨
skills:
  - skill-a
  - skill-b

# ❌ 非推奨
skills: skill-a, skill-b
```

**修正方法**: カンマ区切りをYAMLリスト形式に変換

---

### 3. 廃止された参照

**自動修正**: ❌（レポートのみ）

チェック対象:
- `commands/` への参照（skillsに統合済み）
- 削除されたスキルへの参照

**修正方法**: 手動対応が必要

---

### 4. skills参照の整合性

**自動修正**: ❌（レポートのみ）

frontmatterの `skills:` で参照しているスキルが同一プラグイン内の `skills/` に存在するか確認。

**修正方法**: 手動対応が必要

---

### 5. 非推奨フィールド

**自動修正**: ❌（レポートのみ）

廃止されたfrontmatterフィールドを使用していないか確認。

現在の非推奨フィールド:
- （なし）

**修正方法**: 手動対応が必要

---

### 5b. 非推奨ツール

**自動修正**: ✅

allowed-tools に廃止されたツールが含まれていないか確認。

現在の非推奨ツール:
- `TaskOutput`（v2.1.84で廃止。代わりに `Read` を使用）

```yaml
# ❌ 非推奨
allowed-tools:
  - TaskOutput

# ✅ 推奨
allowed-tools:
  - Read
```

**修正方法**: `TaskOutput` を `Read` に置換（既に `Read` がある場合は `TaskOutput` を削除）

---

### 6. SKILL.md の行数制限

**自動修正**: ❌（警告のみ）

SKILL.md は500行以内に収めることが推奨。詳細なリファレンスは別ファイルに分離する。

```
# ✅ 推奨
SKILL.md: 概要と手順（500行以内）
reference.md: 詳細なAPI仕様
examples.md: 使用例

# ❌ 非推奨
SKILL.md: 全ての情報を1ファイルに（500行超）
```

**修正方法**: 詳細なリファレンスを別ファイルに分離し、SKILL.mdからリンクする

---

### 7. name フィールドの文字数制限

**自動修正**: ❌（警告のみ）

frontmatterの `name:` フィールドは64文字以内。

**修正方法**: より短い名前に変更する

---

### 8. name フィールドの文字種制限

**自動修正**: ❌（警告のみ）

frontmatterの `name:` フィールドは小文字・数字・ハイフンのみ使用可能。

```yaml
# ✅ 有効
name: my-skill-123

# ❌ 無効
name: My_Skill
name: mySkill
name: my skill
```

**修正方法**: 小文字・数字・ハイフンのみに変更する

---

### 9. SKILL.md のファイル名

**自動修正**: ❌（警告のみ）

スキルのエントリポイントは `SKILL.md`（大文字）でなければならない。

```
# ✅ 正しい
skills/my-skill/SKILL.md

# ❌ 間違い
skills/my-skill/skill.md
skills/my-skill/Skill.md
```

**修正方法**: ファイル名を `SKILL.md` にリネームする

---

### 10. スキル呼び出しの明示

**自動修正**: ❌（警告のみ）

スキル内で他のスキルを実行する手順がある場合、呼び出し方法を明示する。

```markdown
# ❌ 曖昧
lint-plugin を実行する

# ✅ 明示的
`/lint-plugin` を実行する

# ✅ より明示的
Skillツールで lint-plugin を呼び出す
```

曖昧な記述は「手動でやればいい」と誤解されてスキップされる可能性がある。

**修正方法**: `/skill-name` または「Skillツールで呼び出す」と明記する

---

### 11. Agent resume パラメータの使用

**自動修正**: ✅

v2.1.77 で Agent tool の `resume` パラメータは削除された。エージェントの継続には `SendMessage({to: agentId})` を使用する。

SKILL.md や agent 定義内で「resumeで」「resumeして」「resumeパラメータ」と記述している場合は `SendMessage` パターンに更新する。

```markdown
# ❌ 非推奨
triage-agentをresumeで修正させる

# ✅ 推奨
triage-agentの agent_id に対して SendMessage(to: agent_id) で修正を依頼する
```

**修正方法**: `resume` の記述を `SendMessage` パターンに置換する

---

### 12. effort frontmatter フィールド

**自動修正**: ❌（情報提供のみ）

v2.1.80 で skills と agents に `effort` frontmatter フィールドが追加された。`low`/`medium`/`high`/`max`（`max`はOpus 4.6のみ）でモデルの思考レベルを制御できる。

軽量な処理（定型的なAPI呼び出し、フォーマット変換等）を行うスキルには `effort: low` の追加を検討する。

```yaml
# 例
---
name: quick-task
effort: low
---
```

---

### 13. description フィールドの文字数上限

**自動修正**: ❌（警告のみ）

v2.1.86 で `/skills` メニューの表示が250文字で打ち切られるようになった。frontmatterの `description:` は250文字以内に収めることを推奨。

**修正方法**: 250文字以内に要約する

---

## 更新履歴

- 2026-03-29: ルール1の対象フィールドを拡張（tools, disallowedToolsを追加）。全ルールの有効性をドキュメントと照合し確認
- 2026-03-29: 非推奨ツール（TaskOutput）ルール追加（v2.1.84対応）、description文字数上限ルール追加（v2.1.86対応）
- 2026-03-22: Agent resumeパラメータ非推奨ルール追加（v2.1.77対応）、effort frontmatterルール追加（v2.1.80対応）
- 2026-02-08: plugin-dev-toolsに移動。スキャン対象を作業ディレクトリの `plugins/` に変更
- 2026-02-06: v2.1.30〜v2.1.33確認。新ルール追加なし。リファレンス更新のみ
- 2026-02-03: SKILL.mdファイル名ルール追加
- 2026-02-03: スキル呼び出しの明示ルール追加
- 2026-02-03: ボリューム関連ルール追加（SKILL.md行数制限、name文字数・文字種制限）
- 2026-02-03: 初版作成（allowed-tools, skills記法、廃止参照、整合性、非推奨フィールド）
