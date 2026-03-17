# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

SkillSmith は、Claude Code のスキル設計パターンをスキーマとして形式化し、GUI上でスキルを組み立てることで設計の一貫性を構造的に保証するツール。Orchestrator + Worker skill + Agent のパターンに沿ったプラグインのみを生成する。

**ステータス**: 開発中（v1.0.0）

## 開発環境

- パッケージマネージャ: `pnpm@10.6.4`（必須）
- `pnpm install` で依存関係をインストール

## アーキテクチャ

### コア設計パターン: Orchestrator中心 + ファイルベース契約

1. **Orchestrator（Entry-point skill）** がワークフロー全体を管理し、各ステップでSub Agentを `Task(subagent_type: ...)` で起動
2. **Worker skill** が専門タスクを担当。必ず対応する Agent を作成し、Agent の `skills:` でプリロード
3. **Sub Agent** の成果物はワークフローファイル（`~/.claude/workflows/{task-id}/`）に保存し、**ファイルパスのみ**をOrchestratorに返す
4. Orchestratorがパスを中継し、次のAgentに渡す（読み込む側はファイル名を知らない）

**重要な制約**: Sub Agentは更にSub Agentを生成できない。そのためオーケストレーター型Entry-pointは必ずSkillとして作成する（Agentにしない）。

### スキルの3分類

| 種類 | 役割 | 例 |
|------|------|-----|
| Entry-point skill | ユーザーが `/skill-name` で呼び出す | `dev`, `review-pr` |
| Worker skill | オーケストレーターの1ステップを担当 | `implement`, `create-pr` |
| Cross-cutting skill | CLAUDE.mdからグローバル注入される横断的関心事 | `slack-notify`, `memory-manager` |

### プラグインディレクトリ構造

```
plugins/{plugin-name}/
├── .claude-plugin/
│   └── plugin.json           # メタデータ（必須）
├── skills/{skill-name}/
│   ├── SKILL.md              # メイン指示（必須）
│   ├── template.md           # 出力フォーマット（任意）
│   └── reference.md          # 詳細リファレンス（任意）
├── agents/
│   └── {name}-agent.md       # 単一ファイルで完結
└── docs/
```

### Skill と Agent の役割分離

- **Skill** = 手順・知識の定義（What）。SKILL.md + サポートファイル群
- **Agent** = 実行環境・振る舞いの定義（How）。単一mdファイル、末尾に `-agent` を付ける命名規約
- Agent本文にはskillの手順を転記しない。`skills:` でプリロードし、agent固有の制約のみ記述

### 情報の保存先（3層）

| パス | 用途 | 管理者 |
|------|------|--------|
| `~/.claude/memory/` | 作業コンテキスト（短期・中期・長期） | memory-manager skill |
| `~/.claude/workflows/` | ステップ間データ受け渡し | 各スキル |
| `~/.claude/state/` | スキル固有の永続状態 | 各スキル |

## リファレンス

設計原則、frontmatterフィールド、allowed-tools選定ガイド、アンチパターン、設計チェックリストの詳細は [docs/reference.md](docs/reference.md) を参照。
