import path from "node:path";
import { access } from "node:fs/promises";
import { registerCommand } from "../router";
import { createOutput } from "../output";
import { parseCommandArgs } from "../command-utils";
import { loadPluginDefinition } from "../../app/lib/loader";
import { exportPlugin } from "../../app/lib/exporter/exporter.server";

export function registerExportCommand(): void {
  registerCommand({
    entity: "plugin",
    action: "export",
    description: "プラグイン定義ファイルからファイルを生成・エクスポート",
    handler: async (ctx) => {
      const output = createOutput(ctx.options);

      const { values, positionals } = parseCommandArgs(ctx.args, {
        output: { type: "string" },
      });

      // --output は必須
      const outputDir = values.output as string | undefined;
      if (!outputDir) {
        output.error({
          type: "validation",
          message: "--output オプションは必須です",
        });
        return 1;
      }

      // positional 引数から plugin-file パスを取得
      const pluginFile = positionals[0];
      if (!pluginFile) {
        output.error({
          type: "validation",
          message: "プラグインファイルのパスを指定してください",
        });
        return 1;
      }

      // plugin-file パスの存在チェック
      const resolvedPluginFile = path.resolve(pluginFile);
      try {
        await access(resolvedPluginFile);
      } catch {
        output.error({
          type: "io",
          message: "ファイルが見つかりません",
          context: resolvedPluginFile,
        });
        return 1;
      }

      // ディレクトリパスを導出して loadPluginDefinition に渡す
      const pluginDir = path.dirname(resolvedPluginFile);

      try {
        const plugin = await loadPluginDefinition(pluginDir);
        const result = await exportPlugin(plugin, {
          targetDir: outputDir,
          overwrite: true,
        });

        if (!result.success) {
          output.error(
            result.errors.map((e) => ({
              type: "execution" as const,
              message: e,
            })),
          );
          return 1;
        }

        output.success({
          exportedDir: result.exportedDir,
          writtenFiles: result.writtenFiles,
          skippedFiles: result.skippedFiles,
        });
        return 0;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "予期しないエラーが発生しました";
        output.error({ type: "execution", message });
        return 1;
      }
    },
  });
}
