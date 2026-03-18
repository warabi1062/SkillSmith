# スキーマ表現形式の比較・推奨案

## 概要

スキル構造をスキーマとして形式化するにあたり、表現形式を3つの候補から比較・選定する。

## 候補

1. **JSON Schema**: 言語非依存のスキーマ定義標準
2. **Zod**: TypeScript ネイティブのスキーマバリデーションライブラリ
3. **カスタム DSL**: プロジェクト独自のスキーマ記述言語

## 比較表

| 評価軸 | JSON Schema | Zod | カスタム DSL |
|--------|-------------|-----|------------|
| TypeScript 統合 | 別途型生成が必要（json-schema-to-typescript 等） | ネイティブ型推論（`z.infer<typeof schema>`） | 自前で型生成を実装 |
| バリデーション | ajv 等の外部ライブラリが必要 | 組み込み（`schema.parse()` / `schema.safeParse()`） | 自前で実装 |
| GUI 連携 | 標準的。react-jsonschema-form 等のツールが豊富 | zod-to-json-schema で JSON Schema に変換可能 | 自前で実装 |
| エコシステム | 広大。言語非依存で多くのツールが対応 | TypeScript 圏で急速拡大。tRPC, React Hook Form 等と統合 | なし |
| 学習コスト | 中。JSON Schema の仕様理解が必要 | 低。TypeScript の知識があれば自然に書ける | 高。独自仕様の学習と保守が必要 |
| Markdown との親和性 | 低。構造データ向きの設計 | 低。同上 | 高。設計次第でMarkdownとの統合が可能 |
| エラーメッセージ | ajv のエラーは機械的で読みにくい | 構造化されたエラー。カスタムメッセージも設定可能 | 設計次第 |
| 拡張性 | $ref による参照、allOf/oneOf 等の合成 | `.extend()`, `.merge()`, discriminated union 等 | 設計次第 |

## 詳細評価

### JSON Schema

**利点**:
- 言語非依存の業界標準。外部ツールとの連携が容易
- GUI フォーム生成ライブラリが充実（react-jsonschema-form, @rjsf/core）
- OpenAPI 等の仕様と親和性が高い

**欠点**:
- TypeScript の型との二重定義が発生する（スキーマと型を別々に管理）
- バリデーションに外部ライブラリ（ajv）が必要
- 複雑な条件分岐（if/then/else）は記述が冗長
- カスタムバリデーション（正規表現以上の検証）が難しい

### Zod

**利点**:
- TypeScript の型を自動推論。スキーマ定義が型定義を兼ねる（Single Source of Truth）
- ランタイムバリデーションが組み込み。`safeParse()` で型安全にパース可能
- `.refine()` / `.superRefine()` でカスタムバリデーションが容易
- discriminated union で Skill の3分類を型安全に表現可能
- `zod-to-json-schema` で JSON Schema へのエクスポートが可能

**欠点**:
- TypeScript 専用。他言語からの利用には JSON Schema への変換が必要
- GUI フォーム連携は JSON Schema 経由になる（1ステップ追加）
- ランタイム依存が増える（バンドルサイズへの影響は軽微: ~50KB）

### カスタム DSL

**利点**:
- Markdown との親和性を自由に設計できる
- プロジェクト固有の制約を直接表現できる

**欠点**:
- パーサー、バリデーター、型生成をすべて自前で実装する必要がある
- エコシステムの恩恵を受けられない
- 保守コストが極めて高い
- 学習コストが高い（新規参入者に独自仕様の理解を強いる）

## 推奨案

**Zod をプライマリとし、必要に応じて JSON Schema へエクスポートする方式を推奨する。**

### 選定理由

1. **SkillSmith は TypeScript プロジェクト**であり、型安全なスキーマ定義が最も自然
2. **Single Source of Truth**: Zod スキーマから TypeScript 型と JSON Schema の両方を導出できる
3. **ランタイムバリデーション**: import した .md ファイルの frontmatter パース結果を即座に検証可能
4. **GUI 連携**: `zod-to-json-schema` で JSON Schema に変換し、フォームライブラリと連携可能
5. **カスタムバリデーション**: `.refine()` で「オーケストレーター型は Agent にしない」等のビジネスルールを表現可能
6. **カスタム DSL は保守コストが高すぎる**: エコシステムの恩恵を受けられず、開発リソースの浪費になる

### 変換パイプライン

```
[Zod Schema]
    |
    ├── z.infer<> ──> TypeScript 型（コンパイル時の型安全）
    |
    ├── schema.parse() ──> ランタイムバリデーション
    |
    └── zodToJsonSchema() ──> JSON Schema（GUI フォーム連携）
```

### 今後の拡張

- GUI 側のフォーム生成が必要になった段階で `zod-to-json-schema` を導入
- 他言語（Python 等）との連携が必要になった場合も JSON Schema エクスポートで対応可能
