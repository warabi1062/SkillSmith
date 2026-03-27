# SkillSmith

Claude Code のスキル設計パターンをスキーマとして形式化し、GUI上でスキルを組み立てることで設計の一貫性を構造的に保証するツール。Orchestrator + Worker skill + Agent のパターンに沿ったプラグインのみを生成する。

## 仕組み

TypeScript でスキル定義（`plugins/{name}/plugin.ts`）を記述すると、SkillSmith が Claude Code プラグイン形式の Markdown ファイル群（SKILL.md, agent.md 等）に変換する。

- **Web UI** でプラグイン構造の閲覧・オーケストレーターの可視化
- **CLI** (`skillsmith plugin export`) でファイルシステムへの出力

### スキル型

| 型 | 用途 |
|---|---|
| `EntryPointSkill` | ユーザーが `/skill-name` で呼び出すオーケストレーター |
| `WorkerSkill` | 単純なワーカー（SKILL.md のみ生成） |
| `WorkerWithSubAgent` | Sub Agent を持つワーカー（SKILL.md + agent.md） |
| `WorkerWithAgentTeam` | Agent Team を持つワーカー（SKILL.md + TeamCreate指示） |

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
```

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [docs/reference.md](docs/reference.md) | プラグイン作成リファレンス。スキル/エージェントの設計パターン、frontmatterフィールド、アンチパターンなど |
| [docs/tool-design.md](docs/tool-design.md) | SkillSmith のツール設計。reference.md のパターンをツールに落とし込む際の設計判断と根拠 |
