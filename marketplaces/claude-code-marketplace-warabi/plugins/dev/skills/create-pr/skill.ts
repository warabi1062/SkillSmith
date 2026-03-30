// create-pr スキル: 実装済みコードのGitHub PR作成

import {
  WorkerWithSubAgent,
  tool,
  bash,
  mcp,
} from "../../../../../../app/lib/types";
import type { SupportFile } from "../../../../../../app/lib/types";

const templateFile: SupportFile = {
  role: "TEMPLATE",
  filename: "template.md",
  sortOrder: 1,
};

const createPrSkill = new WorkerWithSubAgent({
  name: "create-pr",
  displayName: "Create PR",
  description: "実装・コミット済みのコードをプッシュし、GitHub PRを作成する。",
  input: `- チケットID
- 実装計画のパス（orchestrator から渡される）
- 実装結果のパス（orchestrator から渡される、渡されない場合がある）
- ベースブランチ情報のパス（orchestrator から渡される）`,
  allowedTools: [
    tool("Read"),
    tool("Grep"),
    tool("Glob"),
    bash("git *"),
    bash("gh *"),
    tool("Task"),
    tool("ToolSearch"),
    mcp("plugin_linear_linear", "get_issue"),
  ],
  files: [templateFile],
  agentConfig: {
    model: "sonnet",
    tools: [
      tool("Read"),
      tool("Grep"),
      tool("Glob"),
      bash("git *"),
      bash("gh *"),
      tool("ToolSearch"),
    ],
    content: "",
    description: "実装・コミット済みのコードをプッシュし、GitHub PRを作成する",
    sections: [
      {
        heading: "セキュリティ",
        body: "セキュアな情報（APIキー、トークン、パスワード、内部URL、個人情報など）は出力に含めないこと。",
        position: "after-steps",
      },
    ],
  },
  workerSteps: [
    {
      id: "0",
      title: "事前情報の読み込み",
      body: `入力として渡されたパスからファイルを読み込み、実装内容を把握する:
- plan.md（必須）
- implement-result.md（渡された場合のみ）`,
    },
    {
      id: "1",
      title: "チケット情報取得",
      body: "Linear MCPの `get_issue` でチケットのtitle, description, identifierを取得する。",
    },
    {
      id: "2",
      title: "プッシュ前チェック",
      body: `プッシュする前に、コミットに含まれる変更を \`git diff {ベースブランチ}...HEAD\` で確認し、以下が含まれていないことを検証する:

- 機密情報: APIキー、トークン、パスワード、シークレットのハードコーディング
- 機密ファイル: \`.env\`、\`credentials.json\`、秘密鍵ファイル等
- デバッグ残骸: \`console.log\` によるセンシティブな情報の出力、コメントアウトされたデバッグコード
- 意図しないファイル: バイナリファイル、ローカル設定ファイル（\`.idea/\`、\`.vscode/\`等）、\`node_modules/\` 配下

問題が見つかった場合はプッシュせず、ユーザーに報告して対応を判断してもらう。`,
    },
    {
      id: "3",
      title: "プッシュ",
      body: "現在のブランチ（devによって事前に作成済み）のコミット済み変更をリモートにプッシュする。",
    },
    {
      id: "4",
      title: "PR作成",
      body: `\`gh pr create --draft\` でドラフトPRを作成する。
入力として渡された base-branch.txt のパスを読み込み、\`--base {ベースブランチ}\` を指定してPRのマージ先を明示する。
PRタイトル:
- Linearモード: \`{チケットID}: {チケットタイトル}\`（タイトルにチケットIDを含めることでLinearと自動紐づけされる）
- Quickモード: 変更内容を要約したタイトル

PR本文は [${templateFile.filename}](${templateFile.filename}) のフォーマットに従う。

#### PR本文の書き方

PR本文の読み手はレビュアーである。コードの差分は読めば分かるので、PR本文には差分からは読み取れない情報だけを書く。

- Why: チケットの背景課題を簡潔に説明する
- What: 実装アプローチの要約を3〜5行で書く。コードの具体的な変更内容（ファイル名、メソッド名、フィールド追加など）は書かない。差分を見れば分かることを繰り返さない。以下の観点に絞る:
  - 採用したアプローチとその理由（「既存の〇〇と同じパターンで実装した」など）
  - 代替案を選ばなかった理由（あれば）
  - レビュアーが差分を読む前に知っておくべき前提知識
- 確認項目: 実装者が確認すべき項目をチェックリスト形式で書く。以下のような項目:
  - 特定の画面・操作での動作確認（「〇〇画面で△△を実行し、□□が表示されること」）
  - エッジケースの確認（「〇〇が空の場合の挙動」）
  - 既存機能へのデグレ確認（「〇〇機能が従来通り動くこと」）
  - パフォーマンスやUXの観点での確認
  - 各項目は確認手順が明確であること。「問題がないこと」のような曖昧な表現は避け、具体的な操作と期待結果を書く

関連PRがある場合（複数リポジトリにまたがる変更等）は、PR本文に関連PRへのリンクを記載する。`,
    },
    {
      id: "4a",
      title: "既存PRへの追加push時",
      body: `PRが既に作成済みの状態で追加の変更をpushした場合は、まず \`gh pr view --json body\` で現在のPR本文を取得してから、必要な部分だけを更新する。手動で追記されたチェック状態やコメントを上書きしないこと。

更新の手順:
1. \`gh pr view --json body\` で現在のPR本文を取得する
2. 現在の本文をベースに、変更が必要なセクションだけを編集する:
   - 「What / 変更内容」: 全変更を踏まえたアプローチの要約に更新（コードの具体的な変更内容は書かない）
   - 「Why / 背景」: 後から判明した情報があれば追記する
3. 手動で追記・編集された内容（チェック済みの確認項目、追加コメント等）は、必要と判断した場合は残す
4. \`gh pr edit --body\` で更新する`,
    },
    {
      id: "5",
      title: "結果報告",
      body: `ユーザーに以下を報告する:
- PRのURL
- PRの概要
- Linearチケットへのリンク`,
    },
  ],
});

export default createPrSkill;
