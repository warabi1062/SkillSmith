# スキーマ - ファイル変換の設計方針

## 概要

Zod スキーマオブジェクトと実際のプラグインファイル群（.md, .json）の間の相互変換設計を定める。

## 変換の方向

| 方向 | 名称 | 用途 |
|------|------|------|
| Schema -> File | Export | GUI で組み立てたスキーマからプラグインファイル群を生成 |
| File -> Schema | Import | 既存のプラグインファイル群をパースしてスキーマオブジェクトに変換 |

## Export（Schema -> File）設計

### 対象ファイルと変換内容

| 出力ファイル | 入力スキーマ | 変換内容 |
|-------------|------------|---------|
| `.claude-plugin/plugin.json` | `PluginSchema` | JSON シリアライズ |
| `skills/{name}/SKILL.md` | `SkillSchema` | YAML frontmatter + Markdown body |
| `agents/{name}-agent.md` | `AgentSchema` | YAML frontmatter + Markdown body |
| `skills/{name}/template.md` | サポートファイル | そのまま出力 |
| `skills/{name}/reference.md` | サポートファイル | そのまま出力 |

### Frontmatter のシリアライズ

YAML frontmatter は `yaml` パッケージでシリアライズする。

```typescript
// 概念コード
function serializeFrontmatter(data: Record<string, unknown>): string {
  const yaml = stringify(data);
  return `---\n${yaml}---\n`;
}
```

`allowed-tools` の出力形式:
- 4個以下: カンマ区切り（`allowed-tools: Read, Write, Grep, Glob`）
- 5個以上: YAML リスト形式（視認性のため）

### Body（Markdown 本文）の生成

Skill の body は構造化データから Markdown テキストを生成する。

```
SkillBody {
  sections: Section[]
}

Section {
  heading: string       // "## 入力", "## 手順" 等
  level: 2 | 3 | 4
  content: string       // Markdown テキスト
  subsections?: Section[]
}
```

セクションのレンダリング順序:
1. 入力セクション（`## 入力`）
2. 手順セクション（`## 手順` または番号付きステップ `### 1. ...`）
3. 結果保存セクション（任意）
4. 結果返却セクション（任意）

### ディレクトリ構造の生成

```typescript
// 概念コード
function exportPlugin(schema: Plugin): void {
  // 1. ルートディレクトリ作成
  mkdir(`.claude-plugin/`);
  writeJson(`.claude-plugin/plugin.json`, schema.metadata);

  // 2. Skills
  for (const skill of schema.skills) {
    mkdir(`skills/${skill.name}/`);
    writeMd(`skills/${skill.name}/SKILL.md`, skill);
    // サポートファイル
    for (const file of skill.supportFiles) {
      writeFile(`skills/${skill.name}/${file.name}`, file.content);
    }
  }

  // 3. Agents
  for (const agent of schema.agents) {
    writeMd(`agents/${agent.name}-agent.md`, agent);
  }
}
```

## Import（File -> Schema）設計

### パース処理の流れ

```
ファイル群 -> 読み込み -> パース -> バリデーション -> スキーマオブジェクト
```

### Frontmatter のパース

`gray-matter` パッケージで YAML frontmatter と Markdown body を分離する。

```typescript
// 概念コード
import matter from 'gray-matter';

function parseFrontmatter(content: string) {
  const { data, content: body } = matter(content);
  return { frontmatter: data, body };
}
```

### Body の構造解析

Markdown ヘッダーベースでセクションを分割する。

```typescript
// 概念コード
function parseBody(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  // ## / ### / #### でセクション分割
  // 各セクションの content を抽出
  return sections;
}
```

### Zod スキーマによるバリデーション

パースした frontmatter データを Zod スキーマで検証する。

```typescript
// 概念コード
const result = SkillFrontmatterSchema.safeParse(frontmatter);
if (!result.success) {
  // ZodError からユーザーフレンドリーなエラーメッセージを生成
  reportErrors(result.error);
}
```

### エラーハンドリング

バリデーションエラーは以下の形式で報告する:

```typescript
type ValidationError = {
  path: string;        // ファイルパス（例: "skills/dev/SKILL.md"）
  field: string;       // フィールドパス（例: "frontmatter.allowed-tools"）
  message: string;     // エラーメッセージ
  severity: 'error' | 'warning';
};
```

- `error`: 必須フィールドの欠損、型の不一致
- `warning`: 推奨フィールドの欠損、非推奨の記法

## 設計上の課題

### Body 部分の自由度

Markdown 本文は自由記述のため、完全な構造化は難しい。2段階のバリデーションで対応する:

1. **必須セクションの存在チェック**（error レベル）: 入力セクション、手順セクションの有無
2. **推奨構造のバリデーション**（warning レベル）: セクション順序、結果保存/返却セクションの有無

プロトタイプ段階では frontmatter の厳密なスキーマ化を優先し、body は必須セクション存在チェックに留める。

### 既存プラグインとの互換性

Import 時に既存の自由記述 .md をどこまで構造化するか:

- **Lossless Import**: frontmatter はスキーマに変換し、body は生の Markdown テキストとして保持
- **Structured Import**: body も Section 構造に変換（情報損失の可能性あり）

推奨: まず Lossless Import を実装し、必要に応じて Structured Import を追加する。

### allowed-tools の正規化

Import 時にカンマ区切りとYAMLリスト形式の両方を受け付け、内部的には配列に正規化する。

```
入力: "Read, Write, Grep" -> 内部: ["Read", "Write", "Grep"]
入力: ["Read", "Write", "Grep"] -> 内部: ["Read", "Write", "Grep"]
```

## 実装ロードマップ

| フェーズ | 内容 | 対応チケット |
|---------|------|------------|
| Phase 1 | スキーマ定義（Zod） | WAR-7（本チケット） |
| Phase 2 | Import（File -> Schema） | 次チケット |
| Phase 3 | Export（Schema -> File） | 次チケット以降 |
| Phase 4 | GUI 連携（JSON Schema エクスポート） | 将来 |
