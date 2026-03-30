// marketplace.json ジェネレータ
// MarketplaceDefinition + プラグイン情報から marketplace.json を生成する

import type {
  MarketplaceDefinition,
  MarketplaceJson,
  MarketplacePluginEntry,
} from "../types/marketplace";
import type { GeneratedFile, GenerationValidationError } from "./types";

// ジェネレータに渡すプラグイン情報
export interface MarketplacePluginInfo {
  dirName: string;
  name: string;
  description?: string;
}

// ジェネレータの結果型
export interface GenerateMarketplaceJsonResult {
  file: GeneratedFile;
  errors: GenerationValidationError[];
}

const MARKETPLACE_JSON_SCHEMA =
  "https://anthropic.com/claude-code/marketplace.schema.json";

// marketplace.json を生成する
export function generateMarketplaceJson(params: {
  marketplace: MarketplaceDefinition;
  plugins: MarketplacePluginInfo[];
}): GenerateMarketplaceJsonResult {
  const { marketplace, plugins } = params;
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
  if (plugins.length === 0) {
    errors.push({
      severity: "warning",
      code: "MARKETPLACE_NO_PLUGINS",
      message: "marketplace にプラグインが含まれていません",
    });
  }

  // プラグインエントリを生成
  const pluginEntries: MarketplacePluginEntry[] = plugins.map((p) => {
    const entry: MarketplacePluginEntry = {
      name: p.name,
      source: `./plugins/${p.dirName}`,
    };
    if (p.description) {
      entry.description = p.description;
    }
    // pluginOverrides から category を適用
    const override = marketplace.pluginOverrides?.[p.dirName];
    if (override?.category) {
      entry.category = override.category;
    }
    return entry;
  });

  // marketplace.json オブジェクトを構築（参照リポジトリのキー順序に合わせる）
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
