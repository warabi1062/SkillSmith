---
"@warabi1062/skillsmith-core": minor
"@warabi1062/skillsmith-viewer": minor
"@warabi1062/skillsmith": minor
---

hooks 定義を Claude Code の最新仕様に対応させた。

- `HookAction` を `command` / `http` / `mcp_tool` / `prompt` / `agent` の5種の Discriminated Union に拡張。共通フィールド `timeout` / `statusMessage` / `if`、command 型の `args` / `async` / `asyncRewake` / `shell`、prompt 型の `model` / `continueOnBlock`、agent 型の `model` を追加
- イベント名を `HookEvent` 型（公式の全イベント）として定義。既知のイベントは補完・型チェックの対象になり、未知のイベント名は警告付きで通す
- `generateHooks` が仕様違反を検証するようになった（空エントリ、ツール系以外での `if`、SessionStart/Setup での `mcp_tool`、未同梱スクリプトの参照、未クォートの `${CLAUDE_PLUGIN_ROOT}`）
- `HookDefinition.schema` を指定すると `hooks/hooks.json` の先頭に `$schema` を出力
- `exportPlugin` が生成時のバリデーション結果を `validationErrors` として返すようになった。severity が error のものがあれば書き出さずに失敗し、warning は CLI の成功出力に `warnings` として表示する（従来は全て無視されていた）
- viewer のプラグイン詳細に Hooks セクションを追加
- example の code-review プラグインを新フィールドを使う形に更新（`timeout` の単位誤りも修正）
- docs/reference.md に hooks の節を追加
