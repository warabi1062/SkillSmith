// サンプルプラグイン: 全スキルタイプの動作確認用
import type { PluginDefinition } from "../../../../app/lib/types";
import greetSkill from "./skills/greet/skill";
import formatSkill from "./skills/format/skill";
import translateSkill from "./skills/translate/skill";
import reviewTeamSkill from "./skills/review-team/skill";

const plugin: PluginDefinition = {
  name: "hello-world",
  description:
    "全スキルタイプ（EntryPoint / Worker / WorkerWithSubAgent / WorkerWithAgentTeam）の動作確認用サンプルプラグイン",
  category: "example",
  skills: [greetSkill, formatSkill, translateSkill, reviewTeamSkill],
};

export default plugin;
