// プラグイン定義型: スキルの集合を定義する

import type { Skill } from "./skill";
import type { HOOK_EVENTS, HOOK_TYPES } from "./constants";

// ---- hooks ----
// Claude Code の hooks 仕様に準拠（https://code.claude.com/docs/en/hooks）

// Claude Code が発火するフックイベント名
export type HookEvent = (typeof HOOK_EVENTS)[number];

// フックアクションの種類
export type HookType = (typeof HOOK_TYPES)[keyof typeof HOOK_TYPES];

// 全フックアクション共通のフィールド
interface HookActionBase {
  timeout?: number; // タイムアウト秒数（command/http/mcp_tool: 600、prompt: 30、agent: 60 がデフォルト）
  statusMessage?: string; // 実行中にスピナーへ表示するメッセージ
  if?: string; // permission rule 構文による絞り込み（例: "Bash(git *)"）。ツール系イベントでのみ有効
}

// command 型: シェルコマンドまたは実行ファイルを起動する
export interface CommandHookAction extends HookActionBase {
  type: typeof HOOK_TYPES.COMMAND;
  command: string;
  args?: string[]; // 指定すると exec form（シェル解釈なし）。各要素がそのまま1引数になる
  async?: boolean; // true でバックグラウンド実行（timeout は無視される）
  asyncRewake?: boolean; // async 実行時、exit 2 で Claude を起こす
  shell?: "bash" | "powershell"; // 実行に使うシェル
}

// http 型: フック入力 JSON を POST し、レスポンス JSON を決定として扱う
export interface HttpHookAction extends HookActionBase {
  type: typeof HOOK_TYPES.HTTP;
  url: string;
  headers?: Record<string, string>; // 値には $VAR 形式で環境変数を埋め込める
  allowedEnvVars?: string[]; // headers に埋め込みを許可する環境変数名
}

// mcp_tool 型: 接続済み MCP サーバーのツールを呼び出す
export interface McpToolHookAction extends HookActionBase {
  type: typeof HOOK_TYPES.MCP_TOOL;
  server: string; // MCP サーバー名（プラグイン同梱なら "plugin:{plugin}:{server}"）
  tool: string; // ツール名
  input?: Record<string, unknown>; // ツール引数。"${tool_input.file_path}" のようにフック入力を参照できる
}

// prompt 型: 単発の LLM 評価で決定 JSON を返す
export interface PromptHookAction extends HookActionBase {
  type: typeof HOOK_TYPES.PROMPT;
  prompt: string; // $ARGUMENTS にフック入力 JSON が展開される
  model?: string; // 省略時は高速モデル
  continueOnBlock?: boolean; // prompt が ok: false を返したとき、停止せず reason を Claude に返してターンを続ける（公式 JSON Schema に定義あり）
}

// agent 型: ツールを使えるサブエージェントで検証し、決定 JSON を返す（experimental）
export interface AgentHookAction extends HookActionBase {
  type: typeof HOOK_TYPES.AGENT;
  prompt: string; // $ARGUMENTS にフック入力 JSON が展開される
  model?: string; // 省略時は高速モデル
}

// フックアクション: type で分岐する Discriminated Union
export type HookAction =
  | CommandHookAction
  | HttpHookAction
  | McpToolHookAction
  | PromptHookAction
  | AgentHookAction;

// フックエントリ: マッチャーとアクションの組み合わせ
export interface HookEntry {
  matcher?: string; // 省略・""・"*" は全てにマッチ。英数字と "|" のみなら完全一致、それ以外は正規表現
  hooks: HookAction[];
}

// イベント名 → フックエントリ配列
// 既知のイベント名は補完・型チェックの対象になり、未知のイベント名も文字列として受け付ける
// （Claude Code 側で追加された新イベントを SkillSmith の更新を待たずに使えるようにするため）
export type HookEventMap = Partial<Record<HookEvent, HookEntry[]>> &
  Record<string, HookEntry[] | undefined>;

// フックスクリプト: プラグインに同梱するスクリプトファイル
export interface HookScript {
  filename: string; // 出力ファイル名（例: "check-idle.sh"）
  content?: string; // スクリプト内容（contentFile と排他）
  contentFile?: string; // スクリプト内容を外部ファイルから読み込む（プラグインディレクトリからの相対パス）
}

// フック定義: hooks/hooks.json の構造
export interface HookDefinition {
  schema?: string; // hooks.json の $schema に出力する JSON Schema の URL（エディタ補完・検証用。Claude Code は読み込み時に無視する）
  description?: string;
  hooks: HookEventMap;
  scripts?: HookScript[]; // 同梱するスクリプトファイル
}

// plugin.json の author フィールド
export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

// プラグイン定義（依存関係は各スキルが自身の dependencies で宣言する）
// plugin.json のフィールドは Claude Code の plugins 仕様（https://code.claude.com/docs/en/plugins-reference）に準拠
export interface PluginDefinition {
  name: string;
  description?: string;
  version?: string; // semver。指定するとユーザーはバージョン変更時のみ更新を受け取る
  author?: PluginAuthor;
  homepage?: string;
  repository?: string;
  license?: string; // SPDX 識別子（例: "MIT"）
  keywords?: string[];
  category?: string; // marketplace.json のエントリに出力される（plugin.json には含まれない）
  skills: Skill[];
  hooks?: HookDefinition;
}
