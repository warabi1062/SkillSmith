# @warabi1062/skillsmith-core

## 1.1.0

### Minor Changes

- 7670b37: Claude Code の最新仕様との突き合わせで見つかった実装ミスと古い前提を修正した。

  - `AgentConfig.permissionMode` を削除。プラグイン配下の agent では Claude Code が `permissionMode` / `hooks` / `mcpServers` を無視するため、指定しても効果がなかった
  - Worker の agent.md の `disallowedTools` に `Agent` を常に自動付与するようにした。SkillSmith は subagent の連鎖的増殖を防ぐ設計方針として Sub Agent のネストを禁止しており、生成物でそれを担保する
  - `exportPlugin` が hook スクリプト（`scripts/*`）を実行権限付き（0755）で書き出すようになった。exec form はシェルを介さずスクリプトを直接 spawn するため実行権限が必須で、git は実行ビットを保持し Claude Code はインストール時に権限を付与しないため、従来の 0644 では GitHub 経由で配布しても hook が起動できなかった
  - hooks バリデーションで `prompt` / `agent` 型の対応イベントを許可リスト方式に変更（`HOOK_PROMPT_NOT_ALLOWED` を追加）。公式仕様では全 5 種に対応するイベントは 12 種のみで、`PermissionRequest` は `prompt` のみ対応。従来は `PermissionRequest` での `agent` しか検出できなかった
  - team skill の冒頭に Agent Teams が experimental であり `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` が必要な旨を出力するようにした
  - ドキュメント: 「Sub Agent は Sub Agent を生成できない」という記述を、Claude Code の現行仕様（デフォルト 3 階層までネスト可）を踏まえた SkillSmith の設計方針として書き直した。旧ツール名 `Task` を `Agent` / `SendMessage` に更新

- d085dc9: hooks 定義を Claude Code の最新仕様に対応させた。

  - `HookAction` を `command` / `http` / `mcp_tool` / `prompt` / `agent` の 5 種の Discriminated Union に拡張。共通フィールド `timeout` / `statusMessage` / `if`、command 型の `args` / `async` / `asyncRewake` / `shell`、prompt 型の `model` / `continueOnBlock`、agent 型の `model` を追加
  - イベント名を `HookEvent` 型（公式の全イベント）として定義。既知のイベントは補完・型チェックの対象になり、未知のイベント名は警告付きで通す
  - `generateHooks` が仕様違反を検証するようになった（空エントリ、ツール系以外での `if`、SessionStart/Setup での `mcp_tool`、未同梱スクリプトの参照、未クォートの `${CLAUDE_PLUGIN_ROOT}`）
  - `HookDefinition.schema` を指定すると `hooks/hooks.json` の先頭に `$schema` を出力
  - `exportPlugin` が生成時のバリデーション結果を `validationErrors` として返すようになった。severity が error のものがあれば書き出さずに失敗し、warning は CLI の成功出力に `warnings` として表示する（従来は全て無視されていた）
  - viewer のプラグイン詳細に Hooks セクションを追加
  - example の code-review プラグインを新フィールドを使う形に更新（`timeout` の単位誤りも修正）
  - docs/reference.md に hooks の節を追加

- 3b8b474: Skill / Agent / plugin.json / marketplace.json の生成を Claude Code の最新仕様に対応させた。

  - `Skill` に `effort` / `disallowedTools` / `arguments` / `paths` / `whenToUse` を追加し、対応する frontmatter を生成する。`description` + `when_to_use` が 1,536 文字を超えると警告する
  - `SkillModel` / `Teammate.model` / `AgentConfig.model` をエイリアス・`inherit` に加えてフル ID も書ける `ModelSpec` 型に緩和
  - `AgentConfig` に `effort` / `disallowedTools` / `permissionMode` / `maxTurns` / `memory` / `isolation` を追加し、agent.md の frontmatter に出力する
  - `PluginDefinition` に `version` / `author` / `homepage` / `repository` / `license` / `keywords` を追加し、plugin.json に出力する
  - marketplace.json の `$schema` を実在する公式 URL（schemastore）に修正。`owner` を必須にし、欠落時は生成エラーにする
  - オーケストレーターの SKILL.md で「Task ツール」と書いていた箇所を公式名の「Agent ツール」に修正（docs / CLAUDE.md も同様）

## 1.0.4

### Patch Changes

- Web ビューアーで marketplaces ディレクトリのホットリロードに対応した。`pnpm dev` や `skillsmith web` で起動中に `plugin.ts` / `marketplace.ts` / `skill.ts` などを編集すると、サーバーを再起動しなくてもブラウザに自動で反映される。

  - `@warabi1062/skillsmith-core`: ローダーが jiti の `moduleCache: false` で動作するようになり、同一プロセス内で TS ファイルを再読み込みできる
  - `@warabi1062/skillsmith-viewer`: `marketplaces/**` を chokidar で監視し、`/api/events` の SSE で変更をブラウザに通知。クライアントは React Router の `useRevalidator` で全 loader を再実行する

## 1.0.3

### Patch Changes

- 7da7dd2: viewer: SkillDetail で afterSection を steps の後に描画するように変更

## 1.0.2

## 1.0.1

### Patch Changes

- team skill 生成物の Teammate スポーンルールから「subagent_type は指定しない（汎用エージェントとして起動する）」の行を削除した。実運用上は不要な但し書きで、ノイズとなっていたため。

## 1.0.0

### Minor Changes

- f8f5b95: WorkerWithAgentTeam の各 teammate の役割・制約・手順を SKILL.md 本文に全文記述する方式へ戻し、リーダーが prompt にそれを転記してメンバーをスポーンする運用に戻した。あわせて `agents/{skillName}-{teammate.name}.md` の生成は廃止し、Teammate スポーン時は `subagent_type` を指定せず汎用エージェントとして起動する。

  `Teammate.model` は引き続き指定でき、SKILL.md の Teammate セクションに「Agent ツールの model パラメータに `{model}` を指定して起動する」指示として書き出される。スポーンルールにも model 指定がある teammate のみが列挙される。`Teammate.tools` フィールドは廃止した。

## 0.2.3

### Patch Changes

- team skill のリーダーが subagent スポーン時に役割・手順を prompt へ二重指示してしまい動作が不安定になる問題に対処するため、生成される SKILL.md の Teammate セクションを再構成。

  - 概要にリーダーは prompt に役割・手順を再掲しない旨を明記
  - 「Teammate スポーンに関するルール」セクションを新設し、subagent_type / name パラメータ / prompt の指針（独立コンテキスト向け具体情報のみ渡す、役割・制約・手順は再掲しない）を集約
  - メッセージ送受信・レビューサイクル打ち切りルールを「共通ルール」独立セクションから除去し、リーダー制約 / 担当へ吸収
  - `@warabi1062/skillsmith-core/generator` の `buildTeamRules` export を `buildSpawnRules` に置き換え

## 0.2.2

### Patch Changes

- d922157: WorkerWithAgentTeam スキル生成物の SKILL.md 文言を agent md 分離出力に整合させる。

  - 共通ルール: 「定義された名前と完全一致する name でスポーンすること」を廃止し、subagent_type（agent 定義ファイルと一致）と name パラメータ（SendMessage/TaskUpdate で使用）の 2 軸指示に置換
  - teammate セクション: `agents/*.md を参照` の冗長な記述を削除し、`teammate.role` + `subagent_type` の軽量な索引に軽量化
  - `buildTeamRules` の引数を `memberNames: string[]` から `{ skillName: string; memberNames: string[] }` に変更

## 0.2.1

## 0.2.0

### Minor Changes

- 8446ad4: Teammate に model / tools フィールドを追加し、各 teammate ごとに agents/{skillName}-{teammate.name}.md を自動生成するよう変更。SKILL.md の teammate セクションは subagent_type 参照に簡略化。

## 0.1.1

### Patch Changes

- 7084c9f: ## Initial public release

  **What**: `@warabi1062/skillsmith-core` / `@warabi1062/skillsmith-viewer` / `@warabi1062/skillsmith`（CLI）の 3 パッケージを初の public release として npm に公開する。

  **Why**: SkillSmith を monorepo として再編した結果、core / viewer / cli の 3 パッケージ構成が確定したため。Changesets を導入して 3 パッケージを `fixed` で同期管理し、`workspace:*` / `workspace:^` を publish 時に適切なバージョンへ置換できる運用に切り替える。

  **How**: `pnpm add -D @warabi1062/skillsmith` で CLI を導入し、Web UI を併用する場合は `pnpm add -D @warabi1062/skillsmith-viewer` を追加。CLI から `skillsmith web` を実行するとローカルの `marketplaces/` を読むビューアーが起動する。
