// マーケットプレイス定義

import type { MarketplaceDefinition } from "../../app/lib/types";

const marketplace: MarketplaceDefinition = {
  name: "warabi-plugins",
  description: "warabiのカスタムClaude Codeプラグイン集",
  owner: { name: "warabi" },
  pluginOverrides: {
    dev: { category: "development" },
    retrospective: { category: "productivity" },
    "plugin-dev-tools": { category: "development" },
    "slack-notify": { category: "productivity" },
    "sentry-triage": { category: "development" },
    "github-pr": { category: "development" },
  },
};

export default marketplace;
