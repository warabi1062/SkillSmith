export type GenerationValidationSeverity = "error" | "warning";

export interface GenerationValidationError {
  severity: GenerationValidationSeverity;
  code: string;
  message: string;
  componentId?: string;
  field?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  componentId?: string;
}

export interface GeneratedPlugin {
  pluginName: string;
  files: GeneratedFile[];
  validationErrors: GenerationValidationError[];
}
