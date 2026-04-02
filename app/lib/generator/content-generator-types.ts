// content生成関数の共通基底インターフェースと型エイリアス

// content生成関数の共通基底インターフェース
export interface ContentGeneratorInput {
  input?: string[]; // 入力の説明
  output?: string[]; // 出力の説明
}

// content生成関数の型
export type ContentGenerator<T extends ContentGeneratorInput> = (
  input: T,
) => string;
