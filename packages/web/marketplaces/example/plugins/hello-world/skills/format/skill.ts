// WorkerSkill のサンプル: 挨拶メッセージをフォーマットする
import { WorkerSkill, tool } from "@warabi1062/skillsmith-core/types";

const formatSkill = new WorkerSkill({
  name: "format",
  description: "挨拶メッセージを整形するワーカースキル",
  allowedTools: [tool("Read"), tool("Write")],
  input: ["生の挨拶テキスト"],
  output: ["フォーマット済みメッセージ"],
  workerSteps: [
    {
      id: "1",
      title: "テンプレート読み込み",
      body: "挨拶テンプレートファイルを読み込む。",
    },
    {
      id: "2",
      title: "メッセージ整形",
      body: "テンプレートにユーザー名を埋め込み、マークダウン形式で整形する。",
    },
    {
      id: "3",
      title: "結果出力",
      body: "整形済みメッセージをワークフローファイルに書き出す。",
    },
  ],
});

export default formatSkill;
