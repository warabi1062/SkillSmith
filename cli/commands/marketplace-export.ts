import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { registerCommand } from "../router";
import { createOutput } from "../output";
import { parseCommandArgs } from "../command-utils";
import {
  loadPluginDefinition,
  loadMarketplaceDefinition,
} from "../../app/lib/loader";
import { exportPlugin } from "../../app/lib/exporter/exporter.server";
import { generateMarketplaceJson } from "../../app/lib/generator/marketplace-json-generator.server";

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
      });

      // --output は必須
      const outputDir = values.output as string | undefined;
      if (!outputDir) {
        output.error({ type: "validation", message: "--output オプションは必須です" });
        return 1;
      }

      // positional 引数で marketplace ディレクトリのパスを取得
      const marketplaceDir = positionals[0];
      if (!marketplaceDir) {
        output.error({ type: "validation", message: "marketplaceディレクトリのパスを指定してください" });
        return 1;
      }

      const resolvedMarketplaceDir = path.resolve(marketplaceDir);
      const pluginsDir = path.join(resolvedMarketplaceDir, "plugins");

      // marketplace.ts を読み込み
      let marketplaceDef;
      try {
        marketplaceDef = await loadMarketplaceDefinition(
          resolvedMarketplaceDir,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "予期しないエラーが発生しました";
        output.error({ type: "execution", message });
        return 1;
      }

      // marketplace.plugins の順序で各プラグインをエクスポート
      const results: { name: string; success: boolean; error?: string }[] = [];

      for (const pluginDef of marketplaceDef.plugins) {
        const pluginDirPath = path.join(pluginsDir, pluginDef.name);
        try {
          const plugin = await loadPluginDefinition(pluginDirPath);

          // プラグインごとに plugins/{name}/ 配下に出力
          const pluginOutputDir = path.join(outputDir, "plugins", pluginDef.name);
          const result = await exportPlugin(plugin, {
            targetDir: pluginOutputDir,
            overwrite: true,
          });

          if (!result.success) {
            results.push({
              name: pluginDef.name,
              success: false,
              error: result.errors.join("; "),
            });
          } else {
            results.push({ name: pluginDef.name, success: true });
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "予期しないエラーが発生しました";
          results.push({ name: pluginDef.name, success: false, error: message });
        }
      }

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        output.error(
          failed.map((f) => ({
            type: "execution" as const,
            message: f.error ?? "不明なエラー",
            context: f.name,
          })),
        );
        return 1;
      }

      // marketplace.json を生成・書き出し
      const { file: marketplaceFile, errors: marketplaceErrors } =
        generateMarketplaceJson(marketplaceDef);

      // エラーがあればログ出力
      const fatalErrors = marketplaceErrors.filter(
        (e) => e.severity === "error",
      );
      if (fatalErrors.length > 0) {
        output.error(
          fatalErrors.map((e) => ({
            type: "validation" as const,
            message: e.message,
            context: "marketplace.json",
          })),
        );
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
        output.error({
          type: "io",
          message: `marketplace.json の書き出しに失敗しました: ${message}`,
          context: marketplaceJsonPath,
        });
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
