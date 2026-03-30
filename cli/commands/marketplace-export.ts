import path from "node:path";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { registerCommand } from "../router";
import { createOutput } from "../output";
import { parseCommandArgs } from "../command-utils";
import {
  loadPluginDefinition,
  loadMarketplaceDefinition,
} from "../../app/lib/types/loader.server";
import { exportPlugin } from "../../app/lib/exporter.server";
import { generateMarketplaceJson } from "../../app/lib/generator/marketplace-json-generator.server";
import type { MarketplacePluginInfo } from "../../app/lib/generator/marketplace-json-generator.server";

export function registerMarketplaceExportCommand(): void {
  registerCommand({
    entity: "marketplace",
    action: "export",
    description:
      "marketplace内の全プラグインを一括エクスポート（marketplace.json含む）",
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

      // marketplace.ts を読み込み（存在しない場合はエラー）
      let marketplaceDef;
      try {
        marketplaceDef = await loadMarketplaceDefinition(
          resolvedMarketplaceDir,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "予期しないエラーが発生しました";
        output.error(message);
        return 1;
      }

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

      // 各プラグインをエクスポートし、メタ情報を収集
      const results: { name: string; success: boolean; error?: string }[] = [];
      const pluginInfos: MarketplacePluginInfo[] = [];

      for (const dirName of pluginDirNames) {
        const pluginDirPath = path.join(pluginsDir, dirName);
        try {
          const plugin = await loadPluginDefinition(pluginDirPath);

          // marketplace.json 用のプラグイン情報を収集
          pluginInfos.push({
            dirName,
            name: plugin.name,
            description: plugin.description,
          });

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

      // marketplace.json を生成・書き出し
      const { file: marketplaceFile, errors: marketplaceErrors } =
        generateMarketplaceJson({
          marketplace: marketplaceDef,
          plugins: pluginInfos,
        });

      // エラーがあればログ出力
      const fatalErrors = marketplaceErrors.filter(
        (e) => e.severity === "error",
      );
      if (fatalErrors.length > 0) {
        for (const e of fatalErrors) {
          output.error(`marketplace.json: ${e.message}`);
        }
        return 1;
      }

      // marketplace.json をファイルに書き出し
      const resolvedOutputDir = path.resolve(outputDir);
      const marketplaceJsonPath = path.join(
        resolvedOutputDir,
        marketplaceFile.path,
      );
      const marketplaceJsonDir = path.dirname(marketplaceJsonPath);
      try {
        await mkdir(marketplaceJsonDir, { recursive: true });
        await writeFile(marketplaceJsonPath, marketplaceFile.content, "utf-8");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "予期しないエラーが発生しました";
        output.error(`marketplace.json の書き出しに失敗しました: ${message}`);
        return 1;
      }

      output.success({
        marketplace: resolvedMarketplaceDir,
        exportedPlugins: results.map((r) => r.name),
        marketplaceJson: marketplaceJsonPath,
        outputDir,
      });
      return 0;
    },
  });
}
