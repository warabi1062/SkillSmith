// slack-notify プラグイン定義

import type { PluginDefinition } from "../../../../app/lib/types";
import slackNotifySkill from "./skills/slack-notify/skill";

const plugin: PluginDefinition = {
  name: "slack-notify",
  description: "ユーザーへのSlack DM通知を送るプラグイン",
  category: "productivity",
  skills: [slackNotifySkill],
};

export default plugin;
