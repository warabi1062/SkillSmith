# SkillSmith

Claude Code のスキル設計パターンをスキーマとして形式化し、GUI上でスキルを組み立てることで設計の一貫性を構造的に保証するツール。Orchestrator + Worker skill + Agent のパターンに沿ったプラグインのみを生成する。

## 仕組み

TypeScript でスキル定義（`marketplaces/{marketplace}/plugins/{name}/plugin.ts`）を記述すると、SkillSmith が Claude Code プラグイン形式の Markdown ファイル群（SKILL.md, agent.md 等）に変換する。

- **Web UI** でプラグイン構造の閲覧・オーケストレーターの可視化
- **CLI** (`skillsmith plugin export` / `skillsmith marketplace export`) でファイルシステムへの出力

### スキル型

| 型 | 用途 |
|---|---|
| `EntryPointSkill` | ユーザーが `/skill-name` で呼び出すオーケストレーター |
| `WorkerSkill` | 単純なワーカー（SKILL.md のみ生成） |
| `WorkerWithSubAgent` | Sub Agent を持つワーカー（SKILL.md + agent.md） |
| `WorkerWithAgentTeam` | Agent Team を持つワーカー（SKILL.md + TeamCreate指示） |

## アーキテクチャ

### レイヤード構造

`app/lib/` は依存方向を制御した4層構造:

```
app/lib/
├── types/       # Layer 0: 型定義・定数（依存なし）
├── core/        # Layer 1: 共通ロジック（types にのみ依存）
├── loader/      # Layer 2a: プラグイン定義の動的読み込み
├── generator/   # Layer 2b: Markdown ファイル生成パイプライン
├── exporter/    # Layer 3: ファイルシステムへの書き出し
└── utils/       # 横断: UI用ユーティリティ
```

依存ルール: 上位レイヤーのみが下位レイヤーに依存する。loader と generator は相互依存しない。

### 生成パイプライン（generator/）

generator/ 内は2つの責務に分かれる:

- **Content Generator**: スキル型ごとに Markdown 本文を組み立てる純粋関数（orchestrator / worker / agent / team）
- **Serializer**: frontmatter + content を結合し GeneratedFile を生成する（skill-generator / agent-generator 等）

`content-resolver.server.ts` がスキル型に応じた content 生成の分岐を一元管理し、`plugin-generator.server.ts` が全体のオーケストレーションを担当する。

### ファイル命名規約

- `.server.ts`: サーバー専用モジュール（React Router がクライアントバンドルから除外）
- `.ts`: クライアント/サーバー両用（型定義、UI から参照されるロジック）

## セットアップ

```bash
pnpm install
```

## 開発

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm typecheck    # 型チェック
pnpm lint         # Lint (oxlint)
pnpm format       # フォーマット (Biome)
pnpm test         # テスト実行
pnpm cli          # CLI直接実行
pnpm cli plugin export {plugin-dir}                              # 単一プラグインエクスポート
pnpm cli marketplace export {marketplace-dir} --output {dir}     # マーケットプレース一括エクスポート
```

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [docs/reference.md](docs/reference.md) | プラグイン作成リファレンス。スキル/エージェントの設計パターン、frontmatterフィールド、アンチパターンなど |
| [docs/tool-design.md](docs/tool-design.md) | SkillSmith のツール設計。reference.md のパターンをツールに落とし込む際の設計判断と根拠 |
