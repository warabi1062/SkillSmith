# @warabi1062/skillsmith-core

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
