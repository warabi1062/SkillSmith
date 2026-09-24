// マーケットプレイス定義型

import type { PluginDefinition } from "./plugin";

// marketplace.json に出力されるプラグインエントリ
export interface MarketplacePluginEntry {
  name: string;
  description?: string;
  source: string;
  category?: string;
}

// marketplace.ts で定義するマーケットプレイス定義
export interface MarketplaceDefinition {
  name: string;
  description?: string;
  owner: { name: string; email?: string }; // Claude Code の仕様で必須
  plugins: PluginDefinition[];
}

// marketplace.json の出力フォーマット
export interface MarketplaceJson {
  $schema: string;
  name: string;
  description?: string;
  owner: { name: string; email?: string };
  plugins: MarketplacePluginEntry[];
}
