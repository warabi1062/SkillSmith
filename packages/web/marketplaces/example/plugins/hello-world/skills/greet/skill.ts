// EntryPointSkill のサンプル: オーケストレーターとして greet → format の順に実行
import { EntryPointSkill } from "@warabi1062/skillsmith-core/types";
import formatSkill from "../format/skill";

const greetSkill = new EntryPointSkill({
  name: "greet",
  description: "ユーザーに挨拶するオーケストレータースキル",
  userInvocable: true,
  argumentHint: "<name>",
  input: ["挨拶対象の名前"],
  output: ["フォーマット済み挨拶メッセージ"],
  beforeSections: [
    {
      heading: "基本方針",
      body: "常にフレンドリーなトーンで挨拶すること。",
    },
  ],
  steps: [formatSkill],
});

export default greetSkill;
