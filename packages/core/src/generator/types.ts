export type GenerationValidationSeverity = "error" | "warning";

export interface GenerationValidationError {
  severity: GenerationValidationSeverity;
  code: string;
  message: string;
  skillName?: string;
  field?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  skillName?: string;
  executable?: boolean; // true なら実行権限（0o755）付きで書き出す（hook スクリプト用）
}

export interface GeneratedPlugin {
  pluginName: string;
  files: GeneratedFile[];
  validationErrors: GenerationValidationError[];
}
