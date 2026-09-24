// marketplace.json ジェネレータ
// MarketplaceDefinition から marketplace.json を生成する

import type {
  MarketplaceDefinition,
  MarketplaceJson,
  MarketplacePluginEntry,
} from "../types/marketplace";
import type { GeneratedFile, GenerationValidationError } from "./types";
import {
  ERROR_CODES,
  FILE_PATHS,
  MARKETPLACE_JSON_SCHEMA_URL,
} from "../types/constants";

// ジェネレータの結果型
export interface GenerateMarketplaceJsonResult {
  file: GeneratedFile;
  errors: GenerationValidationError[];
}

// marketplace.json を生成する
export function generateMarketplaceJson(
  marketplace: MarketplaceDefinition,
): GenerateMarketplaceJsonResult {
  const errors: GenerationValidationError[] = [];

  // バリデーション: name は必須
  if (!marketplace.name) {
    errors.push({
      severity: "error",
      code: ERROR_CODES.MARKETPLACE_NAME_REQUIRED,
      message: "marketplace の name は必須です",
    });
  }

  // バリデーション: owner は Claude Code の仕様で必須（型上は必須だが、jiti 経由の読み込みでは欠落しうる）
  if (!marketplace.owner?.name) {
    errors.push({
      severity: "error",
      code: ERROR_CODES.MARKETPLACE_OWNER_REQUIRED,
      message: "marketplace の owner.name は必須です",
    });
  }

  // バリデーション: プラグインが0件
  if (marketplace.plugins.length === 0) {
    errors.push({
      severity: "warning",
      code: ERROR_CODES.MARKETPLACE_NO_PLUGINS,
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
    $schema: MARKETPLACE_JSON_SCHEMA_URL,
    name: marketplace.name,
    ...(marketplace.description && { description: marketplace.description }),
    owner: marketplace.owner,
    plugins: pluginEntries,
  };

  const file: GeneratedFile = {
    path: FILE_PATHS.MARKETPLACE_JSON,
    content: `${JSON.stringify(json, null, 2)}\n`,
  };

  return { file, errors };
}
