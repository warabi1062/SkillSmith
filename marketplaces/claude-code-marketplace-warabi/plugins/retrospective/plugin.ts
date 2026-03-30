// retrospective プラグイン定義

import type { PluginDefinition } from "../../../../app/lib/types";
import retrospectiveSkill from "./skills/retrospective/skill";
import improvementSkill from "./skills/improvement/skill";

const plugin: PluginDefinition = {
  name: "retrospective",
  description:
    "作業結果の構造化記録と、レポート分析によるスキル改善を行うプラグイン",
  category: "productivity",
  skills: [retrospectiveSkill, improvementSkill],
};

export default plugin;
