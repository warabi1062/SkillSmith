// コードレビュープラグイン: 全機能パターンの網羅的動作確認用
import type { PluginDefinition } from "@warabi1062/skillsmith-core/types";
import reviewPrSkill from "./skills/review-pr/skill";
import analyzeDiffSkill from "./skills/analyze-diff/skill";
import suggestFixSkill from "./skills/suggest-fix/skill";
import fixTeamSkill from "./skills/fix-team/skill";

const plugin: PluginDefinition = {
  name: "code-review",
  description:
    "PRレビューの自動化プラグイン（Branch・InlineStep・SupportFile・Hooks等の動作確認用）",
  category: "example",
  skills: [reviewPrSkill, analyzeDiffSkill, suggestFixSkill, fixTeamSkill],
  // [10] Hooks（HookDefinition + scripts）
  hooks: {
    description: "レビュー完了時の通知フック",
    hooks: {
      PostToolUse: [
        {
          matcher: "Write",
          hooks: [
            {
              type: "command",
              command:
                "${CLAUDE_PLUGIN_ROOT}/scripts/notify-review.sh 'review completed'",
              timeout: 5000,
            },
          ],
        },
      ],
    },
    scripts: [
      {
        filename: "notify-review.sh",
        contentFile: "hooks/notify-review.sh",
      },
    ],
  },
};

export default plugin;
