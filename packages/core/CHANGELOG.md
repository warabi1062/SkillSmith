# @warabi1062/skillsmith-core

## 0.1.1

### Patch Changes

- 7084c9f: ## Initial public release

  **What**: `@warabi1062/skillsmith-core` / `@warabi1062/skillsmith-viewer` / `@warabi1062/skillsmith`（CLI）の 3 パッケージを初の public release として npm に公開する。

  **Why**: SkillSmith を monorepo として再編した結果、core / viewer / cli の 3 パッケージ構成が確定したため。Changesets を導入して 3 パッケージを `fixed` で同期管理し、`workspace:*` / `workspace:^` を publish 時に適切なバージョンへ置換できる運用に切り替える。

  **How**: `pnpm add -D @warabi1062/skillsmith` で CLI を導入し、Web UI を併用する場合は `pnpm add -D @warabi1062/skillsmith-viewer` を追加。CLI から `skillsmith web` を実行するとローカルの `marketplaces/` を読むビューアーが起動する。
