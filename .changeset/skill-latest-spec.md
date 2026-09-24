---
"@warabi1062/skillsmith-core": minor
"@warabi1062/skillsmith-viewer": minor
"@warabi1062/skillsmith": minor
---

Skill / Agent / plugin.json / marketplace.json の生成を Claude Code の最新仕様に対応させた。

- `Skill` に `effort` / `disallowedTools` / `arguments` / `paths` / `whenToUse` を追加し、対応する frontmatter を生成する。`description` + `when_to_use` が 1,536 文字を超えると警告する
- `SkillModel` / `Teammate.model` / `AgentConfig.model` をエイリアス・`inherit` に加えてフル ID も書ける `ModelSpec` 型に緩和
- `AgentConfig` に `effort` / `disallowedTools` / `permissionMode` / `maxTurns` / `memory` / `isolation` を追加し、agent.md の frontmatter に出力する
- `PluginDefinition` に `version` / `author` / `homepage` / `repository` / `license` / `keywords` を追加し、plugin.json に出力する
- marketplace.json の `$schema` を実在する公式 URL（schemastore）に修正。`owner` を必須にし、欠落時は生成エラーにする
- オーケストレーターの SKILL.md で「Task ツール」と書いていた箇所を公式名の「Agent ツール」に修正（docs / CLAUDE.md も同様）
