// サンプルマーケットプレース: 開発時の動作確認用
import type { MarketplaceDefinition } from "../../app/lib/types";
import helloWorld from "./plugins/hello-world/plugin";
import codeReview from "./plugins/code-review/plugin";

const marketplace: MarketplaceDefinition = {
  name: "example-marketplace",
  description: "SkillSmith開発時の動作確認用マーケットプレース",
  owner: { name: "skillsmith-dev" },
  plugins: [helloWorld, codeReview],
};

export default marketplace;
