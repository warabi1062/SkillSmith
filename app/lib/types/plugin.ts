// プラグイン定義型: スキルの集合を定義する

import type { Skill } from "./skill";

// プラグイン定義（依存関係は各スキルが自身の dependencies で宣言する）
export interface PluginDefinition {
  name: string;
  description?: string;
  category?: string;
  skills: Skill[];
}
