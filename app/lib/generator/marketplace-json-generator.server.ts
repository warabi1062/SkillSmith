// marketplace.json ジェネレータ
// MarketplaceDefinition から marketplace.json を生成する

import type {
  MarketplaceDefinition,
  MarketplaceJson,
  MarketplacePluginEntry,
} from "../types/marketplace";
import type { GeneratedFile, GenerationValidationError } from "./types";

// ジェネレータの結果型
export interface GenerateMarketplaceJsonResult {
  file: GeneratedFile;
  errors: GenerationValidationError[];
}

const MARKETPLACE_JSON_SCHEMA =
  "https://anthropic.com/claude-code/marketplace.schema.json";

// marketplace.json を生成する
export function generateMarketplaceJson(
  marketplace: MarketplaceDefinition,
): GenerateMarketplaceJsonResult {
  const errors: GenerationValidationError[] = [];

  // バリデーション: name は必須
  if (!marketplace.name) {
    errors.push({
      severity: "error",
      code: "MARKETPLACE_NAME_REQUIRED",
      message: "marketplace の name は必須です",
    });
  }

  // バリデーション: プラグインが0件
  if (marketplace.plugins.length === 0) {
    errors.push({
      severity: "warning",
      code: "MARKETPLACE_NO_PLUGINS",
      message: "marketplace にプラグインが含まれていません",
    });
  }

  // プラグインエントリを生成（キー順序: name → description → source → category）
  const pluginEntries: MarketplacePluginEntry[] = marketplace.plugins.map(
    (p) => ({
      name: p.name,
      ...(p.description && { description: p.description }),
      source: `./plugins/${p.name}`,
      ...(p.category && { category: p.category }),
    }),
  );

  // marketplace.json オブジェクトを構築
  const json: MarketplaceJson = {
    $schema: MARKETPLACE_JSON_SCHEMA,
    name: marketplace.name,
    ...(marketplace.description && { description: marketplace.description }),
    ...(marketplace.owner && { owner: marketplace.owner }),
    plugins: pluginEntries,
  };

  const file: GeneratedFile = {
    path: ".claude-plugin/marketplace.json",
    content: `${JSON.stringify(json, null, 2)}\n`,
  };

  return { file, errors };
}
