import path from "node:path";
import { readdir } from "node:fs/promises";
import { registerCommand } from "../router";
import { createOutput } from "../output";
import { parseCommandArgs } from "../command-utils";
import { loadPluginDefinition } from "../../app/lib/types/loader.server";
import { exportPlugin } from "../../app/lib/exporter.server";

export function registerMarketplaceExportCommand(): void {
  registerCommand({
    entity: "marketplace",
    action: "export",
    description:
      "marketplace内の全プラグインを一括エクスポート",
    handler: async (ctx) => {
      const output = createOutput(ctx.options);

      const { values, positionals } = parseCommandArgs(ctx.args, {
        output: { type: "string" },
        overwrite: { type: "boolean" },
      });

      // --output は必須
      const outputDir = values.output as string | undefined;
      if (!outputDir) {
        output.error("--output オプションは必須です");
        return 1;
      }

      // positional 引数で marketplace ディレクトリのパスを取得
      const marketplaceDir = positionals[0];
      if (!marketplaceDir) {
        output.error("marketplaceディレクトリのパスを指定してください");
        return 1;
      }

      const resolvedMarketplaceDir = path.resolve(marketplaceDir);
      const pluginsDir = path.join(resolvedMarketplaceDir, "plugins");

      // plugins/ ディレクトリ内のサブディレクトリを走査
      let pluginDirNames: string[];
      try {
        const entries = await readdir(pluginsDir, { withFileTypes: true });
        pluginDirNames = entries
          .filter((e) => e.isDirectory())
          .map((e) => e.name);
      } catch {
        output.error(
          `marketplaceのpluginsディレクトリが見つかりません: ${pluginsDir}`,
        );
        return 1;
      }

      if (pluginDirNames.length === 0) {
        output.error(
          `marketplaceにプラグインが見つかりません: ${pluginsDir}`,
        );
        return 1;
      }

      // 各プラグインをエクスポート
      const results: { name: string; success: boolean; error?: string }[] = [];
      for (const dirName of pluginDirNames) {
        const pluginDirPath = path.join(pluginsDir, dirName);
        try {
          const plugin = await loadPluginDefinition(pluginDirPath);
          const result = await exportPlugin(plugin, {
            targetDir: outputDir,
            overwrite: !!values.overwrite,
          });

          if (!result.success) {
            results.push({
              name: dirName,
              success: false,
              error: result.errors.join("; "),
            });
          } else {
            results.push({ name: dirName, success: true });
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "予期しないエラーが発生しました";
          results.push({ name: dirName, success: false, error: message });
        }
      }

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        for (const f of failed) {
          output.error(`${f.name}: ${f.error}`);
        }
        return 1;
      }

      output.success({
        marketplace: resolvedMarketplaceDir,
        exportedPlugins: results.map((r) => r.name),
        outputDir,
      });
      return 0;
    },
  });
}
