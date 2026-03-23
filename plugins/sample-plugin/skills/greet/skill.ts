// サンプル EntryPointSkill 定義（型検証用）

import { EntryPointSkill } from "../../../../app/lib/types";
import fetchDataSkill from "../fetch-data/skill";

const greetSkill = new EntryPointSkill({
  name: "greet",
  description: "ユーザーに挨拶するサンプルスキル",
  input: "ユーザー名（任意）",
  output: "挨拶メッセージ",
  argumentHint: "<name>",
  dependencies: [fetchDataSkill],
  files: [
    { role: "TEMPLATE", filename: "template.md", sortOrder: 1 },
  ],
  content: `# Greet

ユーザーに挨拶する。

## 手順

1. ユーザー名が指定されていれば、名前付きで挨拶する
2. 指定されていなければ、一般的な挨拶をする
`,
});

export default greetSkill;
