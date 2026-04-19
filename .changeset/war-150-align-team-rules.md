---
"@warabi1062/skillsmith-core": patch
"@warabi1062/skillsmith": patch
"@warabi1062/skillsmith-viewer": patch
---

WorkerWithAgentTeam スキル生成物の SKILL.md 文言を agent md 分離出力に整合させる。

- 共通ルール: 「定義された名前と完全一致する name でスポーンすること」を廃止し、subagent_type（agent 定義ファイルと一致）と name パラメータ（SendMessage/TaskUpdate で使用）の2軸指示に置換
- teammate セクション: `agents/*.md を参照` の冗長な記述を削除し、`teammate.role` + `subagent_type` の軽量な索引に軽量化
- `buildTeamRules` の引数を `memberNames: string[]` から `{ skillName: string; memberNames: string[] }` に変更
