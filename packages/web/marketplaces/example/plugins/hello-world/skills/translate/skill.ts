// WorkerWithSubAgent のサンプル: メッセージを翻訳するスキル + Agent
import {
  WorkerWithSubAgent,
  tool,
  bash,
} from "@warabi1062/skillsmith-core/types";

const translateSkill = new WorkerWithSubAgent({
  name: "translate",
  description: "メッセージを指定言語に翻訳するワーカースキル（Sub Agent付き）",
  allowedTools: [tool("Read"), tool("Write"), bash("echo *")],
  input: ["翻訳対象のメッセージ", "ターゲット言語"],
  output: ["翻訳済みメッセージ"],
  workerSteps: [
    {
      id: "1",
      title: "原文読み込み",
      body: "翻訳対象のメッセージファイルを読み込む。",
    },
    {
      id: "2",
      title: "翻訳実行",
      body: "指定された言語に翻訳する。文脈を保持しつつ自然な表現にする。",
    },
    {
      id: "3",
      title: "結果保存",
      body: "翻訳結果をワークフローファイルに保存する。",
    },
  ],
  agentConfig: {
    description:
      "翻訳専門のSub Agent。原文のニュアンスを保ちつつ、ターゲット言語で自然な表現に翻訳する。",
    tools: [tool("Read"), tool("Write")],
  },
});

export default translateSkill;
