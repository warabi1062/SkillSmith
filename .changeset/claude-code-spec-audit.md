---
"@warabi1062/skillsmith-core": minor
"@warabi1062/skillsmith": minor
---

Claude Code の最新仕様との突き合わせで見つかった実装ミスと古い前提を修正した。

- `AgentConfig.permissionMode` を削除。プラグイン配下の agent では Claude Code が `permissionMode` / `hooks` / `mcpServers` を無視するため、指定しても効果がなかった
- Worker の agent.md の `disallowedTools` に `Agent` を常に自動付与するようにした。SkillSmith は subagent の連鎖的増殖を防ぐ設計方針として Sub Agent のネストを禁止しており、生成物でそれを担保する
- `exportPlugin` が hook スクリプト（`scripts/*`）を実行権限付き（0755）で書き出すようになった。exec form はシェルを介さずスクリプトを直接 spawn するため実行権限が必須で、git は実行ビットを保持し Claude Code はインストール時に権限を付与しないため、従来の 0644 では GitHub 経由で配布しても hook が起動できなかった
- hooks バリデーションで `prompt` / `agent` 型の対応イベントを許可リスト方式に変更（`HOOK_PROMPT_NOT_ALLOWED` を追加）。公式仕様では全 5 種に対応するイベントは 12 種のみで、`PermissionRequest` は `prompt` のみ対応。従来は `PermissionRequest` での `agent` しか検出できなかった
- team skill の冒頭に Agent Teams が experimental であり `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` が必要な旨を出力するようにした
- ドキュメント: 「Sub Agent は Sub Agent を生成できない」という記述を、Claude Code の現行仕様（デフォルト 3 階層までネスト可）を踏まえた SkillSmith の設計方針として書き直した。旧ツール名 `Task` を `Agent` / `SendMessage` に更新
