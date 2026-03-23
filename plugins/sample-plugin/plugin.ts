// サンプルプラグイン定義（型検証用）

import type { PluginDefinition } from "../../app/lib/types";
import greetSkill from "./skills/greet/skill";
import fetchDataSkill from "./skills/fetch-data/skill";

const plugin: PluginDefinition = {
  name: "sample-plugin",
  description: "型定義の使い勝手を検証するサンプルプラグイン",
  skills: [greetSkill, fetchDataSkill],
  dependencies: [
    {
      source: "greet",
      target: "fetch-data",
      order: 1,
    },
  ],
};

export default plugin;
