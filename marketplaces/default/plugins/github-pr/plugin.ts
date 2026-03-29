// github-pr プラグイン定義

import type { PluginDefinition } from "../../../../app/lib/types";
import reviewPrSkill from "./skills/review-pr/skill";
import triageGithubPrCommentsSkill from "./skills/triage-github-pr-comments/skill";

const plugin: PluginDefinition = {
  name: "github-pr",
  description:
    "GitHub PRのレビューとレビューコメント対応を行うプラグイン",
  skills: [reviewPrSkill, triageGithubPrCommentsSkill],
};

export default plugin;
