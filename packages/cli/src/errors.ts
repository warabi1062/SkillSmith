// CLIエラーの種別
export type CliErrorType = "validation" | "io" | "execution";

// 構造化エラー
export interface CliError {
  type: CliErrorType;
  message: string;
  context?: string; // 例: ファイルパス、プラグイン名
}
