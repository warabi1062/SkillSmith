---
"@warabi1062/skillsmith-core": minor
"@warabi1062/skillsmith-viewer": minor
"@warabi1062/skillsmith": minor
---

WorkerWithAgentTeam の各 teammate の役割・制約・手順を SKILL.md 本文に全文記述する方式へ戻し、リーダーが prompt にそれを転記してメンバーをスポーンする運用に戻した。あわせて `agents/{skillName}-{teammate.name}.md` の生成は廃止し、Teammate スポーン時は `subagent_type` を指定せず汎用エージェントとして起動する。

`Teammate.model` は引き続き指定でき、SKILL.md の Teammate セクションに「Agent ツールの model パラメータに `{model}` を指定して起動する」指示として書き出される。スポーンルールにも model 指定がある teammate のみが列挙される。`Teammate.tools` フィールドは廃止した。
