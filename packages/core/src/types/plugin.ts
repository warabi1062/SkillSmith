// プラグイン定義型: スキルの集合を定義する

import type { Skill } from "./skill";

// フックアクション: 実行するコマンドの定義
export interface HookAction {
  type: "command";
  command: string;
  timeout?: number;
}

// フックエントリ: マッチャーとアクションの組み合わせ
export interface HookEntry {
  matcher?: string;
  hooks: HookAction[];
}

// フックスクリプト: プラグインに同梱するスクリプトファイル
export interface HookScript {
  filename: string; // 出力ファイル名（例: "check-idle.sh"）
  content?: string; // スクリプト内容（contentFile と排他）
  contentFile?: string; // スクリプト内容を外部ファイルから読み込む（プラグインディレクトリからの相対パス）
}

// フック定義: hooks/hooks.json の構造
export interface HookDefinition {
  description?: string;
  hooks: Record<string, HookEntry[]>; // イベント名（例: "TeammateIdle"）→ フックエントリ配列
  scripts?: HookScript[]; // 同梱するスクリプトファイル
}

// プラグイン定義（依存関係は各スキルが自身の dependencies で宣言する）
export interface PluginDefinition {
  name: string;
  description?: string;
  category?: string;
  skills: Skill[];
  hooks?: HookDefinition;
}
