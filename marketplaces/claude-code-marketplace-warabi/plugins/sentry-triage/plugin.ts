// sentry-triage プラグイン定義

import type { PluginDefinition } from "../../../../app/lib/types";
import sentryTriageSkill from "./skills/sentry-triage/skill";
import sentryInvestigateSkill from "./skills/sentry-investigate/skill";

const plugin: PluginDefinition = {
  name: "sentry-triage",
  description:
    "Sentryエラーを調査・トリアージし、対応要否の判断とLinear起票を行う",
  category: "development",
  skills: [sentryTriageSkill, sentryInvestigateSkill],
};

export default plugin;
