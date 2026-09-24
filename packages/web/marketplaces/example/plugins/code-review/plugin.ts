import type { PluginDefinition } from "@warabi1062/skillsmith-core/types";
import reviewPrSkill from "./skills/review-pr/skill";
import analyzeDiffSkill from "./skills/analyze-diff/skill";
import suggestFixSkill from "./skills/suggest-fix/skill";
import fixTeamSkill from "./skills/fix-team/skill";

const plugin: PluginDefinition = {
  name: "code-review",
  description:
    "PRレビューの自動化プラグイン（Branch・InlineStep・SupportFile・Hooks等の動作確認用）",
  version: "1.0.0",
  author: { name: "skillsmith-dev" },
  license: "MIT",
  category: "example",
  skills: [reviewPrSkill, analyzeDiffSkill, suggestFixSkill, fixTeamSkill],
  // [10] Hooks（HookDefinition + scripts）
  hooks: {
    description: "レビュー完了時の通知フックと force push の抑止フック",
    hooks: {
      PostToolUse: [
        {
          matcher: "Write",
          hooks: [
            {
              // exec form: args を指定するとシェル解釈なしで実行される
              type: "command",
              command: "${CLAUDE_PLUGIN_ROOT}/scripts/notify-review.sh",
              args: ["review completed"],
              timeout: 5, // 秒
              statusMessage: "レビュー完了を通知中...",
            },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [
            {
              // prompt 型 + if: force push のときだけ LLM に判断させる
              type: "prompt",
              if: "Bash(git push --force*)",
              prompt:
                "以下のコマンドは force push です。対象ブランチが main または master の場合は deny、それ以外は allow を返してください。\n\n$ARGUMENTS",
              timeout: 30,
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
