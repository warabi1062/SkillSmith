// sentry-triage プラグイン定義

import type { PluginDefinition } from "../../../../app/lib/types";
import sentryTriageSkill from "./skills/sentry-triage/skill";
import sentryInvestigateSkill from "./skills/sentry-investigate/skill";

const plugin: PluginDefinition = {
  name: "sentry-triage",
  description:
    "Sentryエラーの調査・トリアージとLinear起票を行うプラグイン",
  skills: [sentryTriageSkill, sentryInvestigateSkill],
};

export default plugin;
