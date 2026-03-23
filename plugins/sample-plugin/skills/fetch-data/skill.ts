// サンプル WorkerWithSubAgent 定義（型検証用）

import { WorkerWithSubAgent } from "../../../../app/lib/types";

const fetchDataSkill = new WorkerWithSubAgent({
  name: "fetch-data",
  description: "外部APIからデータを取得するサンプルスキル",
  input: "APIエンドポイントURL",
  output: "取得したデータのファイルパス",
  agentConfig: {
    model: "claude-sonnet-4-20250514",
    tools: ["Bash", "Read", "Write"],
    content: `# Fetch Data Agent

外部APIからデータを取得する専用エージェント。

## 振る舞い

- 指定されたURLに対してリクエストを実行する
- レスポンスをワークフローファイルに保存する
- ファイルパスを返す
`,
  },
  content: `# Fetch Data

外部APIからデータを取得し、ワークフローファイルに保存する。

## 手順

1. 入力からAPIエンドポイントURLを取得する
2. Sub Agent を起動してデータを取得する
3. 保存先のファイルパスを返す
`,
});

export default fetchDataSkill;
