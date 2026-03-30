// マーケットプレイス定義

import type { MarketplaceDefinition } from "../../app/lib/types";
import dev from "./plugins/dev/plugin";
import retrospective from "./plugins/retrospective/plugin";
import pluginDevTools from "./plugins/plugin-dev-tools/plugin";
import slackNotify from "./plugins/slack-notify/plugin";
import sentryTriage from "./plugins/sentry-triage/plugin";
import githubPr from "./plugins/github-pr/plugin";

const marketplace: MarketplaceDefinition = {
  name: "warabi-plugins",
  description: "warabiのカスタムClaude Codeプラグイン集",
  owner: { name: "warabi" },
  plugins: [dev, retrospective, pluginDevTools, slackNotify, sentryTriage, githubPr],
};

export default marketplace;
