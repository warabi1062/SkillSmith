// プラグイン定義型: スキルの集合と依存関係を定義する

import type { Skill } from "./skill";

// スキル間の依存関係
export interface SkillDependency {
  source: string; // 依存元スキル名
  target: string; // 依存先スキル名
  order?: number;
}

// プラグイン定義
export interface PluginDefinition {
  name: string;
  description?: string;
  skills: Skill[];
  dependencies: SkillDependency[]; // 依存なしは空配列 []
}
