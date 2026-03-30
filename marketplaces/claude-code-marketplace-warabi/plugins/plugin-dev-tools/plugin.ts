// plugin-dev-tools プラグイン定義

import type { PluginDefinition } from "../../../../app/lib/types";
import checkUpdatesSkill from "./skills/check-updates/skill";
import createPluginSkill from "./skills/create-plugin/skill";
import lintPluginSkill from "./skills/lint-plugin/skill";
import reviewLintRulesSkill from "./skills/review-lint-rules/skill";

const plugin: PluginDefinition = {
  name: "plugin-dev-tools",
  description:
    "Claude Codeプラグイン開発のためのスキル・エージェント作成、lintルール見直し、更新チェックツール群",
  category: "development",
  skills: [checkUpdatesSkill, createPluginSkill, lintPluginSkill, reviewLintRulesSkill],
};

export default plugin;
