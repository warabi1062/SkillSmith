// create-plugin スキル: プラグインの対話的作成・スキル追加
// 注: マーケットプレイスでは disable-model-invocation: true が設定されている

import { WorkerSkill, tool } from "../../../../../../app/lib/types";
import type { SupportFile } from "../../../../../../app/lib/types";

const referenceFile: SupportFile = {
  role: "REFERENCE",
  filename: "reference.md",
  sortOrder: 1,
};

const createPluginSkill = new WorkerSkill({
  name: "create-plugin",
  description:
    "新しいプラグインの作成、または既存プラグインへのスキル・エージェント追加を対話的に行うスキル",
  argumentHint: "[plugin名 or 操作]",
  userInvocable: true,
  disableModelInvocation: true,
  allowedTools: [tool("Read"), tool("Write"), tool("Grep"), tool("Glob")],
  files: [referenceFile],
  content: `# Create Plugin

プラグイン単位でのスキル・エージェント管理を対話的に行う。

## 入力

\`$ARGUMENTS\` に操作内容が渡される場合がある。省略時はヒアリングで決定する。

例:
- \`/create-plugin my-tool\` → 新規プラグイン \`my-tool\` を作成
- \`/create-plugin dev add skill\` → 既存プラグインにスキルを追加
- \`/create-plugin dev add agent\` → 既存プラグインにエージェントを追加

## 作業詳細

### Step 1: 操作の判定

引数やコンテキストから、以下のどの操作かを判定する:

| 操作 | 条件 |
|------|------|
| **新規プラグイン作成** | 指定名のプラグインが存在しない、または明示的に「新規」と指定 |
| **スキル追加** | 既存プラグイン名 + \`add skill\` 等の指定 |
| **エージェント追加** | 既存プラグイン名 + \`add agent\` 等の指定 |

判断できない場合はユーザーに確認する。

### Step 2: リファレンス参照

[reference.md](reference.md) を読み、生成するファイルの具体的な内容を決定する。

### Step 3: 要件ヒアリング

操作に応じて必要な情報をヒアリングする（引数や会話コンテキストから判断できる項目はスキップ）。

#### 新規プラグイン作成の場合

- **プラグイン名**: 小文字・数字・ハイフンのみ
- **概要**: 何をするプラグインか
- **初期スキルの構成**: どんなスキルを含めるか（最低1つ）
- **エージェントの要否**: Worker skillがあるなら対応するAgentも必要

各スキル・エージェントについて、以下のヒアリング項目でそれぞれ確認する。

#### 既存プラグインへのスキル追加の場合

- **スキル名**: 小文字・数字・ハイフンのみ
- **種類**: Entry-point（単体完結型 or オーケストレーター型） / Worker / Cross-cutting
- **概要**: 何をするスキルか
- **呼び出し方**: ユーザーが直接呼ぶか（user-invocable）、Claudeの自動発動を許可するか（disable-model-invocation）
- **必要なツール**: どんな操作をするか（ファイル読み書き、git操作、外部API等）

#### 既存プラグインへのエージェント追加の場合

- **エージェント名**: 小文字・数字・ハイフンのみ（末尾に\`-agent\`を付ける慣習）
- **概要**: 何をするエージェントか
- **モデル**: inherit / sonnet / haiku / opus
- **必要なツール**: どんな操作をするか
- **プリロードするスキル**: どのスキルの知識を持たせるか

### Step 4: ファイル生成

#### 新規プラグイン作成

以下のファイルを順番に生成する:

1. \`plugins/{plugin-name}/.claude-plugin/plugin.json\`（フォーマットは [reference.md](reference.md#pluginjson-フォーマット) を参照）
2. 各スキル: \`plugins/{plugin-name}/skills/{skill-name}/SKILL.md\`（+ 必要に応じてサポートファイル）
3. 各エージェント: \`plugins/{plugin-name}/agents/{agent-name}.md\`

#### 既存プラグインへの追加

- スキル: \`plugins/{plugin-name}/skills/{skill-name}/SKILL.md\`（+ 必要に応じてサポートファイル）
- エージェント: \`plugins/{plugin-name}/agents/{agent-name}.md\`

### Step 5: 確認

生成したファイルの一覧と内容をユーザーに提示し、修正があれば対応する。`,
});

export default createPluginSkill;
