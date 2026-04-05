// content生成関数の共通基底インターフェース
export interface ContentGeneratorInput {
  input?: string[]; // 入力の説明
  output?: string[]; // 出力の説明
}

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
}

export interface GeneratedPlugin {
  pluginName: string;
  files: GeneratedFile[];
  validationErrors: GenerationValidationError[];
}
